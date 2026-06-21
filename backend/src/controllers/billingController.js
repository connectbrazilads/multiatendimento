const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const evolutionService = require('../services/evolutionService');

let io = null;

function setIo(socketIo) {
  io = socketIo;
}

function resolveToken(tenant) {
  return tenant?.settings?.firebirdClientToken || process.env.FIREBIRD_SYNC_TOKEN || '';
}

function assertToken(req, tenant) {
  const expected = resolveToken(tenant);
  const provided = req.header('x-firebird-token') || req.header('authorization')?.replace(/^Bearer\s+/i, '');

  if (!expected) {
    throw new Error('Token de sincronização não configurado no CRM.');
  }

  if (!provided || provided !== expected) {
    throw new Error('Token de sincronização inválido.');
  }
}

async function findContactByCpfCnpj(tenantId, queryCpfCnpj) {
  const cleanQuery = String(queryCpfCnpj || '').replace(/\D/g, '');
  if (!cleanQuery) return null;

  // 1. Tenta buscar o CrmCustomer pelo CPF/CNPJ primeiro
  const crmCustomer = await prisma.crmCustomer.findFirst({
    where: {
      tenantId,
      OR: [
        { cpfCnpj: cleanQuery },
        { cpfCnpj: queryCpfCnpj }
      ]
    },
    include: {
      whatsappContacts: true
    }
  });

  // Se o CrmCustomer foi encontrado e possui contatos vinculados
  if (crmCustomer && crmCustomer.whatsappContacts.length > 0) {
    // Prioriza o contato do WhatsApp real (ex: vinculado manualmente, que não seja externalSource = 'firebird')
    const realContact = crmCustomer.whatsappContacts.find(c => c.externalSource !== 'firebird');
    if (realContact) return realContact;
    return crmCustomer.whatsappContacts[0];
  }

  // Fallback: Busca todos os contatos do tenant
  const contacts = await prisma.contact.findMany({
    where: { tenantId }
  });

  // 2. Tenta correspondência exata de CPF/CNPJ no próprio Contact
  let matched = contacts.find(c => {
    if (c.cpfCnpj) {
      const cleanDb = c.cpfCnpj.replace(/\D/g, '');
      if (cleanDb === cleanQuery) return true;
    }
    return false;
  });

  if (matched) return matched;

  // 3. Tenta por raiz do CNPJ (primeiros 8 dígitos) no nome (padrão do Marcos Rossato)
  if (cleanQuery.length === 14) {
    const rootCnpj = cleanQuery.slice(0, 8); // ex: '35882354'
    const rootCnpjFormatted = `${rootCnpj.slice(0, 2)}.${rootCnpj.slice(2, 5)}.${rootCnpj.slice(5, 8)}`; // '35.882.354'

    matched = contacts.find(c => {
      const nameLower = (c.name || '').toLowerCase();
      return nameLower.includes(rootCnpj) || nameLower.includes(rootCnpjFormatted);
    });

    if (matched) return matched;
  }

  // 4. Tenta por CPF completo formatado ou limpo no nome
  if (cleanQuery.length === 11) {
    const cpfFormatted = `${cleanQuery.slice(0, 3)}.${cleanQuery.slice(3, 6)}.${cleanQuery.slice(6, 9)}-${cleanQuery.slice(9, 11)}`;
    matched = contacts.find(c => {
      const nameLower = (c.name || '').toLowerCase();
      return nameLower.includes(cleanQuery) || nameLower.includes(cpfFormatted);
    });

    if (matched) return matched;
  }

  return null;
}

async function sendBilling(req, res) {
  const { tenantSlug, cpfCnpj } = req.body;
  const files = req.files || [];

  try {
    if (!tenantSlug) {
      return res.status(400).json({ error: 'tenantSlug é obrigatório.' });
    }
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'cpfCnpj é obrigatório.' });
    }
    if (files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true, instances: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado.' });
    }

    // Valida token do client local
    assertToken(req, tenant);

    const contact = await findContactByCpfCnpj(tenant.id, cpfCnpj);
    if (!contact) {
      // Registra a falha no log de cobrança
      await prisma.billingLog.create({
        data: {
          tenantId: tenant.id,
          cpfCnpj,
          fileName: files.map(f => f.originalname).join(', '),
          status: 'FAILED',
          errorMessage: 'Cliente não encontrado no CRM.'
        }
      });
      return res.status(404).json({ error: 'Cliente não encontrado no CRM.' });
    }

    if (contact.disableWhatsAppBilling) {
      // Registra que o envio foi ignorado por configuração do usuário
      await prisma.billingLog.create({
        data: {
          tenantId: tenant.id,
          cpfCnpj,
          clientName: contact.name,
          fileName: files.map(f => f.originalname).join(', '),
          status: 'FAILED',
          errorMessage: 'Envio desativado para este contato nas configurações.'
        }
      });
      return res.json({ success: true, message: 'Envio desativado para este contato nas configurações.' });
    }

    const evolutionUrl = tenant.settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
    const evolutionKey = tenant.settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;
    let instanceName = tenant.instances.find(item => String(item.status).toLowerCase() === 'connected')?.instanceName || tenant.instances[0]?.instanceName;

    if (!evolutionUrl || !evolutionKey || !instanceName) {
      throw new Error('Integração com WhatsApp não configurada ou sem instâncias conectadas.');
    }

    const phone = evolutionService.normalizePhoneNumber(contact.phone || '');
    if (!phone) {
      throw new Error('Telefone do cliente inválido ou não cadastrado.');
    }

    // Busca ou abre um ticket para o cliente
    let ticket = await prisma.ticket.findFirst({
      where: {
        contactId: contact.id,
        status: { in: ['pending', 'open', 'bot'] }
      }
    });

    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          tenantId: tenant.id,
          instanceId: tenant.instances.find(i => i.instanceName === instanceName)?.id || tenant.instances[0]?.id,
          contactId: contact.id,
          status: 'open'
        }
      });
      if (io) io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id, ticket });
    }

    // 1. Envia as mídias (PDFs) sequencialmente
    for (const file of files) {
      const base64 = (await fs.promises.readFile(file.path)).toString('base64');
      const mime = file.mimetype;
      const mediaUrl = `/uploads/media/${file.filename}`;

      console.log(`[billing] Enviando ${file.originalname} para ${phone}...`);
      const result = await evolutionService.sendMedia(evolutionUrl, evolutionKey, instanceName, phone, {
        mediatype: 'document',
        media: base64,
        mimetype: mime,
        filename: file.originalname,
        filePath: file.path
      });

      const externalId = result?.key?.id || result?.message?.key?.id;

      // Cria a mensagem correspondente no banco
      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          body: '',
          fromMe: true,
          mediaUrl,
          mediaType: 'document',
          fileName: file.originalname,
          externalId,
          mediaStatus: 'ok'
        }
      });
    }

    // 2. Envia a mensagem de texto com o template
    const template = tenant.settings?.billingMessageTemplate || 'Olá! Seguem em anexo sua fatura, boleto e demonstrativo deste mês. Se tiver qualquer dúvida, estamos à disposição.';
    
    console.log(`[billing] Enviando texto de cobrança para ${phone}...`);
    const textResult = await evolutionService.sendText(evolutionUrl, evolutionKey, instanceName, phone, template);
    const textExternalId = textResult?.key?.id || textResult?.message?.key?.id;

    // Salva a mensagem de texto no histórico
    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        body: template,
        fromMe: true,
        externalId: textExternalId
      }
    });

    // Atualiza data do ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { lastMessageAt: new Date() }
    });

    // Log de sucesso no DB
    await prisma.billingLog.create({
      data: {
        tenantId: tenant.id,
        cpfCnpj,
        clientName: contact.name,
        fileName: files.map(f => f.originalname).join(', '),
        status: 'SUCCESS'
      }
    });

    if (io) {
      io.to(tenant.id).emit('new_message', { ticketId: ticket.id });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[sendBilling] erro:', err.message);
    // Tenta registrar o erro no banco se tivermos o tenant
    if (tenantSlug) {
      try {
        const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
        if (tenant) {
          await prisma.billingLog.create({
            data: {
              tenantId: tenant.id,
              cpfCnpj,
              fileName: files.map(f => f.originalname).join(', '),
              status: 'FAILED',
              errorMessage: err.message
            }
          });
        }
      } catch (logErr) {
        console.error('[sendBilling] Erro ao salvar log de erro no DB:', logErr.message);
      }
    }
    res.status(500).json({ error: err.message });
  }
}

async function triggerBillingProcess(req, res) {
  const { tenantId } = req.user;

  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    if (!settings) {
      return res.status(404).json({ error: 'Configurações do tenant não encontradas.' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId },
      data: { firebirdQueueBillingProcess: true }
    });

    res.json({ ok: true, message: 'Processamento de cobranças enfileirado para o client local.' });
  } catch (err) {
    console.error('[triggerBillingProcess] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getBillingLogs(req, res) {
  const { tenantId } = req.user;

  try {
    const logs = await prisma.billingLog.findMany({
      where: { tenantId },
      orderBy: { sentAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (err) {
    console.error('[getBillingLogs] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function saveBillingSettings(req, res) {
  const { tenantId } = req.user;
  const { billingMessageTemplate } = req.body;

  try {
    await prisma.tenantSettings.update({
      where: { tenantId },
      data: { billingMessageTemplate }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[saveBillingSettings] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  setIo,
  sendBilling,
  triggerBillingProcess,
  getBillingLogs,
  saveBillingSettings
};
