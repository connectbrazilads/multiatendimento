const prisma = require('../lib/prisma');
const historyService = require('../services/historyService');
const geminiService = require('../services/geminiService');
const path = require('path');
const fs = require('fs');
let io;
function setIo(socketIo) { io = socketIo; }

async function list(req, res) {
  const { status, mine, priority, agentId, teamId, search } = req.query;
  const where = { tenantId: req.user.tenantId };
  
  if (req.user.role !== 'admin') {
    const userTeams = await prisma.teamMember.findMany({
      where: { userId: req.user.userId },
      select: { teamId: true }
    });
    const teamIds = userTeams.map(ut => ut.teamId);

    if (mine === 'true') {
      where.agentId = req.user.userId;
    } else {
      where.OR = [
        { teamId: { in: teamIds } },
        { teamId: null },
        { agentId: req.user.userId }
      ];
    }
  }

  if (status) {
    if (status === 'pending') {
      where.status = { in: ['pending', 'bot'] };
    } else {
      where.status = status;
    }
  } else if (mine === 'true') {
    where.status = 'open';
  }
  
  if (mine === 'true') {
    where.agentId = req.user.userId;
  } else if (agentId) {
    where.agentId = agentId;
  }

  if (teamId) {
    where.teamId = teamId;
  }

  if (priority) {
    where.priority = priority;
  }

  if (search) {
    const searchFilter = [
      { contact: { name: { contains: search, mode: 'insensitive' } } },
      { contact: { phone: { contains: search } } }
    ];
    if (where.OR) {
      // Se já houver OR (filtro de equipe), faz um AND entre o filtro de equipe e a busca
      const teamFilter = where.OR;
      delete where.OR;
      where.AND = [
        { OR: teamFilter },
        { OR: searchFilter }
      ];
    } else {
      where.OR = searchFilter;
    }
  }

  console.log('[debug] list tickets where:', JSON.stringify(where, null, 2));

  let tickets = await prisma.ticket.findMany({
    where,
    include: { 
      contact: true, 
      agent: { select: { id: true, name: true } }, 
      team: true,
      instance: { select: { instanceName: true } }
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

  // Busca as contagens globais para os badges
  const [countMine, countPending, countResolved] = await Promise.all([
    prisma.ticket.count({ where: { tenantId: req.user.tenantId, agentId: req.user.userId, status: 'open' } }),
    prisma.ticket.count({ where: { tenantId: req.user.tenantId, status: { in: ['pending', 'bot'] } } }),
    prisma.ticket.count({ where: { tenantId: req.user.tenantId, status: 'resolved' } })
  ]);

  res.json({
    tickets,
    counts: {
      mine: countMine,
      pending: countPending,
      resolved: countResolved
    }
  });
}

async function getMessages(req, res) {
  const { id } = req.params;
  const ticket = await prisma.ticket.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  // Busca todos os tickets do contato para montar histórico completo (filtrando pelo tenant)
  const allTickets = await prisma.ticket.findMany({
    where: { contactId: ticket.contactId, tenantId: req.user.tenantId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, createdAt: true, status: true },
  });

  const messages = await prisma.message.findMany({
    where: { ticketId: { in: allTickets.map(t => t.id) } },
    orderBy: { createdAt: 'asc' },
    include: { agent: { select: { name: true } } },
  });

  const events = await prisma.ticketEvent.findMany({
    where: { ticketId: { in: allTickets.map(t => t.id) } },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { name: true } } }
  });

  // Une mensagens e eventos, ordenando por data de criação
  const combined = [
    ...messages.map(m => ({ ...m, _type: 'message' })),
    ...events.map(e => ({ ...e, _type: 'event', createdAt: e.createdAt }))
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Injeta marcadores de sessão entre tickets
  const ticketMap = Object.fromEntries(allTickets.map(t => [t.id, t]));
  const result = [];
  let lastTicketId = null;

  for (const item of combined) {
    const tId = item.ticketId;
    if (tId !== lastTicketId) {
      const t = ticketMap[tId];
      result.push({
        _separator: true,
        date: t.createdAt,
        ticketId: t.id,
        isCurrent: t.id === id,
      });
      lastTicketId = tId;
    }
    result.push(item);
  }

  res.json(result);
}

async function assign(req, res) {
  const { id } = req.params;
  const { agentId, teamId } = req.body;

  const existing = await prisma.ticket.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Ticket não encontrado' });

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      agentId: agentId || null,
      teamId: teamId || null,
      status: agentId ? 'open' : (teamId ? 'pending' : 'open'),
    },
    include: { contact: true, agent: { select: { id: true, name: true } }, team: true },
  });

  if (io) {
    io.to(ticket.tenantId).emit('ticket_updated', { ticketId: ticket.id, status: ticket.status, ticket });
  }

  // Auditoria de transferência/atribuição
  await historyService.logEvent({
    ticketId: ticket.id,
    tenantId: ticket.tenantId,
    userId: req.user.userId,
    type: agentId ? 'assigned' : (teamId ? 'transferred' : 'unassigned'),
    payload: { agentId, teamId, agentName: ticket.agent?.name, teamName: ticket.team?.name }
  });

  // GERAÇÃO DE RESUMO IA (ASSÍNCRONO)
  if (agentId || teamId) {
    (async () => {
       try {
         const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: ticket.tenantId } });
         if (settings?.geminiKey && settings?.botEnabled) {
            const history = await prisma.message.findMany({
              where: { ticketId: ticket.id },
              orderBy: { createdAt: 'desc' },
              take: 30
            });
            if (history.length >= 5) { // Só resume se houver conversa mínima
               const summary = await geminiService.generateTransferSummary(settings.geminiKey, history.reverse());
               if (summary) {
                  await historyService.logEvent({
                    ticketId: ticket.id,
                    tenantId: ticket.tenantId,
                    type: 'ia_summary',
                    payload: JSON.stringify({ summary })
                  });
                  if (io) io.to(ticket.tenantId).emit('ticket_updated', { id: ticket.id });
               }
            }
         }
       } catch (e) { console.error('[assign] erro resumo IA:', e.message); }
    })();
  }

  res.json(ticket);
}

async function update(req, res) {
  const { id } = req.params;
  const { priority, status } = req.body;

  const existing = await prisma.ticket.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Ticket não encontrado' });

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      ...(priority && { priority }),
      ...(status && { status })
    }
  });

  res.json(ticket);
}

async function resolve(req, res) {
  const { id } = req.params;
  const existing = await prisma.ticket.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Ticket não encontrado' });

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { status: 'resolved', resolvedAt: new Date() },
    include: { contact: true }
  });

  // Auditoria
  await historyService.logEvent({
    ticketId: ticket.id,
    tenantId: req.user.tenantId,
    userId: req.user.userId,
    type: 'resolved'
  });

  // Gatilho de Webhook Externo e Pesquisa de Satisfação
  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
  
  (async () => {
    try {
      // 1. Webhook Externo
      if (settings?.webhookUrl) {
        const axios = require('axios');
        await axios.post(settings.webhookUrl, {
          event: 'ticket_resolved',
          ticket: { id: ticket.id, contact: ticket.contact.phone, resolvedAt: ticket.resolvedAt }
        }, { timeout: 5000 }).catch(e => console.error('[webhook_external] erro:', e.message));
      }

      // 2. Pesquisa de Satisfação (CSAT)
      console.log(`[CSAT_CHECK] Ticket=${ticket.id} Enabled=${settings?.ratingEnabled}`);
      if (settings?.ratingEnabled) {
        const evolutionService = require('../services/evolutionService');
        const waInstance = await prisma.waInstance.findUnique({ where: { id: ticket.instanceId } });
        
        if (waInstance) {
          console.log(`[CSAT_SEND] Enviando para ${ticket.contact.phone} via ${waInstance.instanceName}`);
          const ratingText = settings.ratingMessage || "Como você avalia nosso atendimento de 1 a 5?";
          const result = await evolutionService.sendText(
            settings.evolutionUrl, 
            settings.evolutionKey, 
            waInstance.instanceName, 
            ticket.contact.phone, 
            ratingText
          );

          // Registrar no banco para aparecer no chat
          await prisma.message.create({
            data: {
              ticketId: ticket.id,
              body: ratingText,
              fromMe: true,
              fromBot: true,
              externalId: result?.key?.id || result?.message?.key?.id
            }
          });
          if (io) io.to(req.user.tenantId).emit('new_message', { ticketId: ticket.id });

        } else {
          console.error(`[CSAT_ERROR] Instância não encontrada: ${ticket.instanceId}`);
        }
      }
    } catch (err) {
      console.error('[after_resolve] erro:', err.message);
    }
  })();
  res.json(ticket);

  // IA: Geração de Tags Automáticas ao encerrar
  if (settings?.geminiKey) {
    (async () => {
      try {
        const geminiService = require('../services/geminiService');
        const history = await prisma.message.findMany({
          where: { ticketId: id },
          orderBy: { createdAt: 'asc' },
          take: 30
        });
        
        console.log(`[autoTags] analisando ticket ${id}...`);
        
        // 1. Buscar Etiquetas Oficiais (Master List)
        const officialTags = await prisma.tag.findMany({ where: { tenantId: ticket.tenantId } });
        const tagNames = officialTags.map(t => t.name);

        // 2. Pedir para a IA escolher apenas entre as oficiais
        const newTags = await geminiService.generateTags(settings.geminiKey, history, tagNames);
        
        if (newTags && newTags.length > 0) {
          console.log(`[autoTags] tags sugeridas: ${newTags.join(', ')}`);
          const currentTags = JSON.parse(ticket.contact.tags || '[]');
          const combined = Array.from(new Set([...currentTags, ...newTags]));
          
          await prisma.contact.update({
            where: { id: ticket.contactId },
            data: { tags: JSON.stringify(combined) }
          });
        }
      } catch (err) {
        console.error('[autoTags] erro:', err.message);
      }
    })();
  }
}

async function sendMessage(req, res) {
  const { id } = req.params;
  const { body } = req.body;

  const ticket = await prisma.ticket.findFirst({
    where: { id, tenantId: req.user.tenantId },
    include: { contact: true, instance: true },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
  const evolutionService = require('../services/evolutionService');
  const agent = await prisma.user.findUnique({ where: { id: req.user.userId } });
  const finalBody = `*${agent.name}*\n${body}`;

  const result = await evolutionService.sendText(settings.evolutionUrl, settings.evolutionKey, ticket.instance.instanceName, ticket.contact.phone, finalBody);
  const externalId = result?.key?.id || result?.message?.key?.id;

  // Auto-atribuição se o ticket não estiver aberto ou estiver sem agente
  if (ticket.status !== 'open' || !ticket.agentId) {
    await prisma.ticket.update({
      where: { id },
      data: { status: 'open', agentId: req.user.userId }
    });
    if (io) io.to(req.user.tenantId).emit('ticket_updated', { ticketId: id });
  }

  // SLA: Marca primeira resposta do agente
  if (!ticket.firstResponseAt) {
    await prisma.ticket.update({
      where: { id },
      data: { firstResponseAt: new Date() }
    });
  }

  const message = await prisma.message.create({
    data: { ticketId: id, agentId: req.user.userId, body, fromMe: true, externalId },
  });
  res.json(message);
}

async function sendMediaMessage(req, res) {
  const { id } = req.params;
  const file = req.file;
  const caption = req.body.caption || '';

  if (!file) return res.status(400).json({ error: 'Arquivo obrigatório' });

  const ticket = await prisma.ticket.findFirst({
    where: { id, tenantId: req.user.tenantId },
    include: { contact: true, instance: true },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
  const evolutionService = require('../services/evolutionService');


  const base64 = fs.readFileSync(file.path).toString('base64');
  const mime = file.mimetype;

  let mediaUrl = `/uploads/media/${file.filename}`;
  let mediaType = 'document';

  const agent = await prisma.user.findUnique({ where: { id: req.user.userId } });
  const finalCaption = `*${agent.name}*\n${caption}`;

  let result;
  if (mime.startsWith('image/')) {
    mediaType = 'image';
    result = await evolutionService.sendMedia(settings.evolutionUrl, settings.evolutionKey, ticket.instance.instanceName, ticket.contact.phone, {
      mediatype: 'image', media: base64, caption: finalCaption,
    });
  } else if (mime.startsWith('audio/')) {
    mediaType = 'audio';
    // Normalização Unificada: OGG/Opus 16kHz (SaaS + WhatsApp)
    try {
      const mediaService = require('../services/mediaService');
      const oldPath = file.path;
      
      const newPath = await mediaService.normalizeAudio(oldPath);
      const newFilename = path.basename(newPath);
      mediaUrl = `/uploads/media/${newFilename}`;
      
      const oggBase64 = fs.readFileSync(newPath).toString('base64');
      result = await evolutionService.sendAudio(settings.evolutionUrl, settings.evolutionKey, ticket.instance.instanceName, ticket.contact.phone, oggBase64);
    } catch (err) {
      console.error('[audioConvert] erro:', err.message);
      result = await evolutionService.sendAudio(settings.evolutionUrl, settings.evolutionKey, ticket.instance.instanceName, ticket.contact.phone, base64);
    }
  } else {
    result = await evolutionService.sendMedia(settings.evolutionUrl, settings.evolutionKey, ticket.instance.instanceName, ticket.contact.phone, {
      mediatype: 'document', media: base64, filename: file.originalname, caption: finalCaption,
    });
  }

  const externalId = result?.key?.id || result?.message?.key?.id;

  // Auto-atribuição se o ticket não estiver aberto ou estiver sem agente
  if (ticket.status !== 'open' || !ticket.agentId) {
    await prisma.ticket.update({
      where: { id },
      data: { status: 'open', agentId: req.user.userId }
    });
    if (io) io.to(req.user.tenantId).emit('ticket_updated', { ticketId: id });
  }

  const message = await prisma.message.create({
    data: {
      ticketId: id,
      agentId: req.user.userId,
      body: caption,
      fromMe: true,
      mediaUrl,
      mediaType,
      externalId,
    },
  });

  // Transcrição de áudio do AGENTE (Gemini 2.5)
  if (mediaType === 'audio' && settings?.geminiKey) {
    (async () => {
      try {
        const geminiService = require('../services/geminiService');
        const audioPath = path.join(__dirname, '../../', mediaUrl);
        const audioBase64 = fs.readFileSync(audioPath).toString('base64');
        
        console.log(`[agentTranscription] iniciando msg=${message.id}`);
        // Gemini entende OGG/Opus perfeitamente
        const transcription = await geminiService.transcribeAudio(settings.geminiKey, audioBase64, 'audio/ogg');
        if (transcription) {
          console.log(`[agentTranscription] ok: ${transcription.substring(0, 30)}`);
          const updated = await prisma.message.update({ where: { id: message.id }, data: { transcription } });
          if (io) io.to(req.user.tenantId).emit('message_updated', { ticketId: id, message: updated });
        }
      } catch (err) {
        console.error('[agentTranscription] erro:', err.message);
      }
    })();
  }

  res.json(message);
}

async function reopen(req, res) {
  const { contactId } = req.body;
  if (!contactId) return res.status(400).json({ error: 'contactId obrigatório' });

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId: req.user.tenantId },
  });
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

  // Verifica se já existe ticket aberto para esse contato
  const existing = await prisma.ticket.findFirst({
    where: { contactId, status: { in: ['pending', 'open', 'bot'] } },
  });
  if (existing) return res.json(existing);

  const ticket = await prisma.ticket.create({
    data: {
      tenantId: req.user.tenantId,
      instanceId: contact.instanceId,
      contactId,
      agentId: req.user.userId,
      status: 'open',
    },
    include: { contact: true }
  });

  // Auditoria
  await historyService.logEvent({
    ticketId: ticket.id,
    tenantId: req.user.tenantId,
    userId: req.user.userId,
    type: 'reopened'
  });

  res.json(ticket);
}

async function summarize(req, res) {
  console.log('[DEBUG] summarize chamado para ticket:', req.params.id);
  const { id } = req.params;
  const ticket = await prisma.ticket.findFirst({
    where: { id, tenantId: req.user.tenantId },
    include: {
      messages: { orderBy: { createdAt: 'asc' }, take: 50 },
      contact: true,
    },
  });

  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
  if (!settings?.geminiKey) return res.status(400).json({ error: 'IA não configurada para este tenant' });

  const geminiService = require('../services/geminiService');
  const history = ticket.messages;
  const prompt = `Resuma o histórico desta conversa de atendimento ao cliente com ${ticket.contact.name || ticket.contact.phone}. Identifique o problema principal e o estado atual da resolução. Seja conciso e use tópicos.`;
  
  try {
    const summary = await geminiService.summarize(settings.geminiKey, 'Você é um supervisor de atendimento. Gere resumos executivos.', history, prompt);
    res.json({ summary });
  } catch (err) {
    console.error('[summarize] erro:', err.message);
    res.status(500).json({ error: 'Erro ao gerar resumo: ' + err.message });
  }
}

async function deleteMessage(req, res) {
  const { messageId } = req.params;
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { ticket: { include: { contact: true, instance: true } } }
  });

  if (!message || message.ticket.tenantId !== req.user.tenantId) {
    return res.status(404).json({ error: 'Mensagem não encontrada ou acesso negado' });
  }
  if (!message.fromMe) return res.status(403).json({ error: 'Você só pode apagar suas próprias mensagens no WhatsApp' });

  try {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
    const evolutionService = require('../services/evolutionService');
    
    // Revoga no WhatsApp
    await evolutionService.revokeMessage(
      settings.evolutionUrl,
      settings.evolutionKey,
      message.ticket.instance.instanceName,
      message.ticket.contact.phone,
      message.externalId
    );

    // Marca como apagada no banco
    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { isDeleted: true }
    });

    res.json(updated);
  } catch (err) {
    console.error('[deleteMessage] erro:', err.message);
    res.status(500).json({ error: 'Erro ao apagar mensagem no WhatsApp' });
  }
}

async function spellCheck(req, res) {
  const { text } = req.body;
  if (!text || text.trim().length < 3) return res.json({ corrected: null });

  try {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
    if (!settings?.geminiKey) return res.json({ corrected: null });

    const geminiService = require('../services/geminiService');
    const corrected = await geminiService.spellCheck(settings.geminiKey, text.trim());
    res.json({ corrected });
  } catch (err) {
    console.error('[spellCheck] erro:', err.message);
    res.json({ corrected: null }); // Nunca bloqueia o envio
  }
}

module.exports = { list, getMessages, assign, resolve, update, sendMessage, sendMediaMessage, deleteMessage, reopen, summarize, spellCheck, setIo };
