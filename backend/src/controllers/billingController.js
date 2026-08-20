const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const evolutionService = require('../services/evolutionService');
const billingDocuments = require('../services/billingDocumentService');
const { mediaPath } = require('../utils/uploads');

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

function getCpfCnpjVariations(query) {
  const clean = String(query || '').replace(/\D/g, '');
  if (!clean) return [];

  const variations = [clean, String(query)];

  if (clean.length === 11) {
    const formatted = `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
    variations.push(formatted);
  } else if (clean.length === 14) {
    const formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
    variations.push(formatted);
  }

  return [...new Set(variations)];
}

async function findContactByCpfCnpj(tenantId, queryCpfCnpj) {
  const cleanQuery = String(queryCpfCnpj || '').replace(/\D/g, '');
  if (!cleanQuery) return null;

  const variations = getCpfCnpjVariations(queryCpfCnpj);

  // 1. Tenta buscar o CrmCustomer pelo CPF/CNPJ primeiro
  const crmCustomer = await prisma.crmCustomer.findFirst({
    where: {
      tenantId,
      cpfCnpj: { in: variations }
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
    const { tenantSlug, cpfCnpj, sendPolicy } = req.body;
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

      const isSendToAll = String(sendPolicy).toLowerCase() === 'todos';

      if (!isSendToAll && !contact.enableWhatsAppBilling) {
        // Registra que o envio foi ignorado por configuração do usuário (opt-in desativado por padrão)
        await prisma.billingLog.create({
        data: {
          tenantId: tenant.id,
          cpfCnpj,
          clientName: contact.name,
          fileName: files.map(f => f.originalname).join(', '),
          status: 'FAILED',
          errorMessage: 'Envio de cobrança via WhatsApp não habilitado para este contato (opt-in desativado).'
        }
      });
      return res.json({ success: true, message: 'Envio de cobrança via WhatsApp não habilitado para este contato.' });
    }

    const evolutionUrl = tenant.settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
    const evolutionKey = tenant.settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;
    let instanceName = tenant.instances.find(item => String(item.status).toLowerCase() === 'connected')?.instanceName || tenant.instances[0]?.instanceName;

    if (!evolutionUrl || !evolutionKey || !instanceName) {
      throw new Error('Integração com WhatsApp não configurada ou sem instâncias conectadas.');
    }

    const phone = evolutionService.normalizePhoneNumber(contact.whatsapp || contact.phone || '');
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

    // 1. Envia a mensagem de texto com o template primeiro - o cliente le a
    // explicacao ("Segue anexo...") antes de receber os PDFs, nao depois.
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

    // 2. Envia as mídias (PDFs) sequencialmente
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

async function autoSendBilling(req, res) {
  // Chamado pelo agente (nao por um usuario logado) quando o indice de
  // Documentos financeiros encontra, sem ambiguidade, um pacote completo para
  // um titulo em aberto. Substitui a antiga varredura de pasta: o cliente e
  // identificado com precisao pelo proprio agente (CNPJ + numero + datas +
  // valor), aqui so falta checar o opt-in e entregar pelo WhatsApp.
  const { tenantSlug, receivableExternalId, sendPolicy, documents } = req.body || {};

  try {
    if (!tenantSlug) return res.status(400).json({ error: 'tenantSlug é obrigatório.' });
    if (!receivableExternalId) return res.status(400).json({ error: 'receivableExternalId é obrigatório.' });
    if (!Array.isArray(documents) || !documents.length) {
      return res.status(400).json({ error: 'Nenhum documento informado.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true, instances: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado.' });
    assertToken(req, tenant);

    const receivableRecord = await prisma.externalSyncRecord.findFirst({
      where: { tenantId: tenant.id, source: 'firebird', entity: 'receivables', externalId: String(receivableExternalId) },
      select: { payload: true },
    });
    if (!receivableRecord) {
      return res.status(404).json({ error: 'Título financeiro não encontrado para este envio automático.' });
    }
    const clientExternalId = String(receivableRecord.payload?.clientExternalId ?? receivableRecord.payload?.cdcliente ?? '');
    if (!clientExternalId) {
      return res.status(404).json({ error: 'Título sem cliente vinculado no iLux.' });
    }

    const crmCustomer = await prisma.crmCustomer.findFirst({
      where: { tenantId: tenant.id, externalId: clientExternalId },
    });
    if (!crmCustomer) {
      return res.status(404).json({ error: 'Cliente do CRM não encontrado para este título.' });
    }
    const customerName = crmCustomer.fantasyName || crmCustomer.name;

    // Guarda cada documento do mesmo jeito que um clique manual no CRM guardaria
    // -- assim, se alguem abrir esse titulo no CRM depois, ja aparece pronto em
    // vez de pedir pro agente de novo. Os campos do "receivable" abaixo sao um
    // stub: o agente ja confirmou que cada tipo existe, casando o PDF real
    // contra este titulo antes de chamar este endpoint.
    const cachedDocuments = [];
    for (const document of documents) {
      const documentType = String(document.documentType || '').toLowerCase();
      const stubReceivable = {
        externalId: String(receivableExternalId),
        invoiceNumber: receivableExternalId,
        invoiceExternalId: documentType === 'invoice' ? 'auto' : null,
        statementExternalId: documentType === 'statement' ? 'auto' : null,
        hasBoleto: documentType === 'boleto',
      };
      const request = await billingDocuments.queueDocumentRequest({
        tenantId: tenant.id,
        receivable: stubReceivable,
        customerName,
        documentType,
      });
      await billingDocuments.completeDocumentRequest({
        request,
        success: true,
        result: {
          documentType,
          pdfBase64: document.pdfBase64,
          fileName: document.fileName,
          mimeType: document.mimeType || 'application/pdf',
        },
      });
      const stored = await prisma.externalSyncRecord.findUnique({ where: { id: request.id }, select: { payload: true } });
      cachedDocuments.push({
        documentType,
        fileName: stored.payload.fileName,
        mediaUrl: stored.payload.mediaUrl,
        mimeType: stored.payload.mimeType || 'application/pdf',
      });
    }

    const fileNames = cachedDocuments.map((document) => document.fileName).join(', ');
    const contact = await findContactByCpfCnpj(tenant.id, crmCustomer.cpfCnpj);
    const isSendToAll = String(sendPolicy).toLowerCase() === 'todos';

    if (!contact) {
      await prisma.billingLog.create({
        data: { tenantId: tenant.id, cpfCnpj: crmCustomer.cpfCnpj, clientName: customerName, fileName: fileNames, status: 'FAILED', errorMessage: 'Contato de WhatsApp não encontrado para envio automático.' },
      });
      return res.json({ success: true, message: 'Documentos preparados, mas não há contato de WhatsApp para enviar automaticamente.' });
    }
    if (!isSendToAll && !contact.enableWhatsAppBilling) {
      await prisma.billingLog.create({
        data: { tenantId: tenant.id, cpfCnpj: crmCustomer.cpfCnpj, clientName: customerName, fileName: fileNames, status: 'FAILED', errorMessage: 'Envio automático via WhatsApp não habilitado para este contato (opt-in desativado).' },
      });
      return res.json({ success: true, message: 'Envio automático não habilitado para este contato.' });
    }

    const evolutionUrl = tenant.settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
    const evolutionKey = tenant.settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;
    const instanceName = tenant.instances.find((item) => String(item.status).toLowerCase() === 'connected')?.instanceName || tenant.instances[0]?.instanceName;
    if (!evolutionUrl || !evolutionKey || !instanceName) {
      throw new Error('Integração com WhatsApp não configurada ou sem instâncias conectadas.');
    }
    const phone = evolutionService.normalizePhoneNumber(contact.whatsapp || contact.phone || '');
    if (!phone) throw new Error('Telefone do cliente inválido ou não cadastrado.');

    // Busca ou abre uma conversa para o cliente -- precisa funcionar mesmo com
    // quem nunca trocou mensagem no WhatsApp antes, como o fluxo antigo fazia.
    let ticket = await prisma.ticket.findFirst({
      where: { contactId: contact.id, status: { in: ['pending', 'open', 'bot'] } },
    });
    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          tenantId: tenant.id,
          instanceId: tenant.instances.find((item) => item.instanceName === instanceName)?.id || tenant.instances[0]?.id,
          contactId: contact.id,
          status: 'open',
        },
      });
      if (io) io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id, ticket });
    }

    // A mensagem de apresentação ("Segue anexo...") precisa chegar ANTES dos
    // documentos, nao depois - e assim que o cliente le a explicacao antes
    // de ver os PDFs, nao o contrario.
    const template = tenant.settings?.billingMessageTemplate || 'Olá! Seguem em anexo sua fatura, boleto e demonstrativo deste mês. Se tiver qualquer dúvida, estamos à disposição.';
    const textResult = await evolutionService.sendText(evolutionUrl, evolutionKey, instanceName, phone, template);
    const textExternalId = textResult?.key?.id || textResult?.message?.key?.id;
    await prisma.message.create({ data: { ticketId: ticket.id, body: template, fromMe: true, externalId: textExternalId } });

    for (const document of cachedDocuments) {
      const filePath = path.join(mediaPath, path.basename(document.mediaUrl));
      const base64 = (await fs.promises.readFile(filePath)).toString('base64');
      const result = await evolutionService.sendMedia(evolutionUrl, evolutionKey, instanceName, phone, {
        mediatype: 'document',
        media: base64,
        mimetype: document.mimeType,
        filename: document.fileName,
        filePath,
      });
      const externalId = result?.key?.id || result?.message?.key?.id;
      const message = await prisma.message.create({
        data: { ticketId: ticket.id, body: '', fromMe: true, mediaUrl: document.mediaUrl, mediaType: 'document', fileName: document.fileName, externalId, mediaStatus: 'ok' },
      });
      if (io) io.to(tenant.id).emit('new_message', { ticketId: ticket.id, message, fromMe: true });
    }

    const updatedTicket = await prisma.ticket.update({ where: { id: ticket.id }, data: { lastMessageAt: new Date() } });

    await prisma.billingLog.create({
      data: { tenantId: tenant.id, cpfCnpj: crmCustomer.cpfCnpj, clientName: customerName, fileName: fileNames, status: 'SUCCESS' },
    });
    await prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        tenantId: tenant.id,
        userId: null,
        type: 'billing_documents_resent',
        payload: JSON.stringify({
          receivableExternalId: String(receivableExternalId),
          documentTypes: cachedDocuments.map((document) => document.documentType),
          phone,
          automatic: true,
        }),
      },
    });

    if (io) io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id, ticket: updatedTicket });

    return res.json({ success: true, message: `Enviado automaticamente para ${customerName} (${phone}).` });
  } catch (err) {
    console.error('[autoSendBilling] erro:', err.message);
    try {
      if (tenantSlug) {
        const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
        if (tenant) {
          await prisma.billingLog.create({
            data: {
              tenantId: tenant.id,
              cpfCnpj: '',
              fileName: (documents || []).map((document) => document.fileName).join(', '),
              status: 'FAILED',
              errorMessage: err.message,
            },
          });
        }
      }
    } catch (logErr) {
      console.error('[autoSendBilling] erro ao salvar log:', logErr.message);
    }
    return res.status(500).json({ error: err.message });
  }
}

async function logTestBilling(req, res) {
  // Chamado pelo agente quando o envio automatico esta em modo teste: nada e
  // enviado pelo WhatsApp, so espelhamos a simulacao na tela de Logs do CRM
  // (status "TEST") para o gestor acompanhar sem precisar acessar o log
  // local do agente.
  const { tenantSlug, cpfCnpj, customerName, fileNames } = req.body || {};

  try {
    if (!tenantSlug) return res.status(400).json({ error: 'tenantSlug é obrigatório.' });
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado.' });
    assertToken(req, tenant);

    await prisma.billingLog.create({
      data: {
        tenantId: tenant.id,
        cpfCnpj: cpfCnpj || '',
        clientName: customerName || null,
        fileName: Array.isArray(fileNames) ? fileNames.join(', ') : String(fileNames || ''),
        status: 'TEST',
      },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[logTestBilling] erro:', err.message);
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
  autoSendBilling,
  logTestBilling,
  triggerBillingProcess,
  getBillingLogs,
  saveBillingSettings
};
