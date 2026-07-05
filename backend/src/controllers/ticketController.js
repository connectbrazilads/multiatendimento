const prisma = require('../lib/prisma');
const historyService = require('../services/historyService');
const geminiService = require('../services/geminiService');
const evolutionService = require('../services/evolutionService');
const path = require('path');
const fs = require('fs');
let io;
function setIo(socketIo) { io = socketIo; }
const avatarRefreshCache = new Map();
const AVATAR_REFRESH_TTL_MS = 6 * 60 * 60 * 1000;
const AVATAR_REFRESH_LIMIT = 10;

function getMimeTypeFromFileName(fileName = '', mediaType = 'document') {
  const ext = path.extname(fileName).toLowerCase();
  const mimeByExt = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.3gp': 'video/3gpp',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  if (mimeByExt[ext]) return mimeByExt[ext];
  if (mediaType === 'image') return 'image/jpeg';
  if (mediaType === 'video') return 'video/mp4';
  if (mediaType === 'audio') return 'audio/mpeg';
  return 'application/octet-stream';
}

function getRecentConversation(messages = [], hours = 24, maxItems = 30) {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  const recent = messages.filter(message => new Date(message.createdAt).getTime() >= cutoff);
  return recent.slice(-maxItems);
}

async function getUserVisibilityFilter(user) {
  return null;
}

function buildWhere(conditions) {
  const filtered = conditions.filter(Boolean);
  if (filtered.length === 1) return filtered[0];
  return { AND: filtered };
}

function getTicketStatusWeight(status) {
  return { open: 3, pending: 2, bot: 2, resolved: 1 }[status] || 0;
}

function isTicketPreferred(candidate, current) {
  const candidateWeight = getTicketStatusWeight(candidate?.status);
  const currentWeight = getTicketStatusWeight(current?.status);

  if (candidateWeight !== currentWeight) {
    return candidateWeight > currentWeight;
  }

  return new Date(candidate?.updatedAt || 0).getTime() > new Date(current?.updatedAt || 0).getTime();
}

function dedupeTicketsByContact(tickets = []) {
  const grouped = new Map();

  for (const ticket of tickets) {
    const key = ticket.contactId || ticket.contact?.id || ticket.id;
    const current = grouped.get(key);

    if (!current || isTicketPreferred(ticket, current)) {
      grouped.set(key, ticket);
    }
  }

  return Array.from(grouped.values()).sort((a, b) => (
    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  ));
}

function shouldAttemptAvatarRefresh(ticket) {
  const phone = ticket?.contact?.phone;
  const instanceName = ticket?.instance?.instanceName;
  if (!phone || !instanceName) return false;

  const avatarUrl = ticket?.contact?.avatarUrl || '';
  if (!avatarUrl) return true;

  return /^https?:\/\//i.test(avatarUrl);
}

function getAvatarRefreshKey(ticket) {
  return `${ticket?.instanceId || 'no-instance'}:${ticket?.contactId || 'no-contact'}`;
}

async function refreshTicketAvatarInBackground(ticket) {
  const refreshKey = getAvatarRefreshKey(ticket);
  const now = Date.now();
  const lastAttemptAt = avatarRefreshCache.get(refreshKey) || 0;
  if (now - lastAttemptAt < AVATAR_REFRESH_TTL_MS) return;

  avatarRefreshCache.set(refreshKey, now);

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ticket.tenantId },
      include: { settings: true },
    });

    if (!tenant?.settings?.evolutionUrl || !tenant.settings?.evolutionKey) return;

    const nextAvatarUrl = await evolutionService.fetchProfilePicture(
      tenant.settings.evolutionUrl,
      tenant.settings.evolutionKey,
      ticket.instance.instanceName,
      ticket.contact.phone,
    );

    if (!nextAvatarUrl || nextAvatarUrl === ticket.contact.avatarUrl) return;

    await prisma.contact.update({
      where: { id: ticket.contact.id },
      data: { avatarUrl: nextAvatarUrl },
    });

    if (!io) return;

    const freshTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        contact: true,
        agent: { select: { id: true, name: true } },
        team: true,
        instance: { select: { instanceName: true } },
      },
    });

    if (freshTicket) {
      io.to(ticket.tenantId).emit('ticket_updated', { ticket: freshTicket });
    }
  } catch (error) {
    console.error('[ticket avatars] falha ao renovar avatar:', error.message);
  }
}

function refreshVisibleTicketAvatars(tickets = []) {
  const uniqueCandidates = [];
  const seenKeys = new Set();

  for (const ticket of tickets) {
    if (!shouldAttemptAvatarRefresh(ticket)) continue;

    const refreshKey = getAvatarRefreshKey(ticket);
    if (seenKeys.has(refreshKey)) continue;

    seenKeys.add(refreshKey);
    uniqueCandidates.push(ticket);

    if (uniqueCandidates.length >= AVATAR_REFRESH_LIMIT) break;
  }

  uniqueCandidates.forEach((ticket) => {
    refreshTicketAvatarInBackground(ticket).catch(() => {});
  });
}

async function list(req, res) {
  const { status, mine, priority, agentId, teamId, search } = req.query;
  const visibilityFilter = await getUserVisibilityFilter(req.user);
  const pendingCondition = {
    OR: [
      { status: { in: ['pending', 'bot'] } },
      { status: 'open', agentId: null }
    ]
  };
  const conditions = [{ tenantId: req.user.tenantId }];
  
  if (mine === 'true') {
    conditions.push({ agentId: req.user.userId });
  } else if (visibilityFilter) {
    conditions.push(visibilityFilter);
  }

  if (status) {
    if (status === 'pending') {
      conditions.push(pendingCondition);
    } else if (status === 'all') {
      // "Contatos" - Mostra resolvidos e todos os em atendimento (independente de quem atende)
      conditions.push({ status: { in: ['resolved', 'open'] } });
    } else {
      conditions.push({ status });
    }
  } else if (mine === 'true') {
    conditions.push({ status: 'open' });
  }
  
  if (mine !== 'true' && agentId) {
    conditions.push({ agentId });
  }

  if (teamId) {
    conditions.push({ teamId });
  }

  if (priority) {
    conditions.push({ priority });
  }

  if (search) {
    conditions.push({
      OR: [
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { fantasyName: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search } } }
      ]
    });
  }

  const where = buildWhere(conditions);

  let tickets = await prisma.ticket.findMany({
    where,
    include: { 
      contact: { include: { crmCustomer: true } }, 
      agent: { select: { id: true, name: true } }, 
      team: true,
      instance: { select: { instanceName: true } }
    },
    orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
    take: 200,
  });

  if (status === 'all') {
    tickets = dedupeTicketsByContact(tickets);
  }

  refreshVisibleTicketAvatars(tickets);

  // Busca as contagens globais para os badges
  const [countMine, countPending, countResolved, countAllGroups] = await Promise.all([
    prisma.ticket.count({ where: { tenantId: req.user.tenantId, agentId: req.user.userId, status: 'open' } }),
    prisma.ticket.count({
      where: buildWhere([
        { tenantId: req.user.tenantId },
        visibilityFilter,
        pendingCondition
      ])
    }),
    prisma.ticket.count({
      where: buildWhere([
        { tenantId: req.user.tenantId },
        visibilityFilter,
        { status: 'resolved' }
      ])
    }),
    prisma.ticket.groupBy({
      by: ['contactId'],
      where: buildWhere([
        { tenantId: req.user.tenantId },
        visibilityFilter,
        { status: { in: ['resolved', 'open'] } }
      ])
    })
  ]);

  res.json({
    tickets,
    counts: {
      mine: countMine,
      pending: countPending,
      resolved: countResolved,
      all: countAllGroups.length
    }
  });
}

async function getMessages(req, res) {
  const { id } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 20), 100);
  const before = req.query.before ? new Date(req.query.before) : null;
  const includeHistory = req.query.includeHistory === 'true';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const ticket = await prisma.ticket.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!ticket) return res.status(404).json({ error: 'Ticket nao encontrado' });

  if (ticket.unreadCount > 0) {
    await prisma.ticket.update({
      where: { id },
      data: { unreadCount: 0 }
    });
    if (io) io.to(req.user.tenantId).emit('ticket_updated', { id, unreadCount: 0 });
  }

  const allTickets = includeHistory
    ? await prisma.ticket.findMany({
        where: { contactId: ticket.contactId, tenantId: req.user.tenantId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true, status: true },
      })
    : [{ id: ticket.id, createdAt: ticket.createdAt, status: ticket.status }];

  const ticketIds = allTickets.map(t => t.id);
  const createdAtFilter = before && !Number.isNaN(before.getTime()) ? { lt: before } : undefined;
  const messageSearchFilter = search
    ? {
        OR: [
          { body: { contains: search, mode: 'insensitive' } },
          { transcription: { contains: search, mode: 'insensitive' } },
          { quotedMsgBody: { contains: search, mode: 'insensitive' } },
          { fileName: { contains: search, mode: 'insensitive' } },
        ],
      }
    : undefined;

  const messages = await prisma.message.findMany({
    where: {
      ticketId: { in: ticketIds },
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...(messageSearchFilter || {}),
    },
    orderBy: { createdAt: 'desc' },
    take: search ? limit + 1 : limit * 2,
    include: { agent: { select: { name: true } } },
  });

  const events = search
    ? []
    : await prisma.ticketEvent.findMany({
        where: {
          ticketId: { in: ticketIds },
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: { select: { name: true } } }
      });

  const combinedDesc = [
    ...messages.map(m => ({ ...m, _type: 'message' })),
    ...events.map(e => ({ ...e, _type: 'event' }))
  ]
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .slice(0, limit + 1);

  const hasMore = combinedDesc.length > limit;
  const pageItems = hasMore ? combinedDesc.slice(0, limit) : combinedDesc;
  const combined = pageItems.reverse();

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

  const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.createdAt : null;
  res.json({
    items: result,
    hasMore,
    nextCursor: nextCursor ? new Date(nextCursor).toISOString() : null,
  });
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
              orderBy: { createdAt: 'asc' },
              take: 100
            });
            const recentHistory = getRecentConversation(history, 24, 30);
            if (recentHistory.length >= 5) {
               const summary = await geminiService.generateTransferSummary(settings.geminiKey, recentHistory);
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

  // IA: Geração de Tags Automáticas ao encerrar (DESATIVADO pelo usuário)
  /*
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
  */
}

async function sendMessage(req, res) {
  const { id } = req.params;
  const { body, quotedMsgId } = req.body;

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { contact: true, instance: true },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
    const evolutionUrl = settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
    const evolutionKey = settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;

    if (!evolutionUrl || !evolutionKey) {
      return res.status(400).json({ error: 'Integração com o WhatsApp (Evolution API) não configurada para esta empresa' });
    }

    const evolutionService = require('../services/evolutionService');
    const agent = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!agent) return res.status(400).json({ error: 'Usuário/Agente não encontrado' });
    const finalBody = `*${agent.name}*\n${body}`;
    
    let quotedMsgBody = null;
    if (quotedMsgId) {
      const quoted = await prisma.message.findFirst({ where: { externalId: quotedMsgId } });
      if (quoted) quotedMsgBody = quoted.body;
    }
    
    // Normaliza o número: se tiver 10 ou 11 dígitos, adiciona 55
    const phone = evolutionService.normalizePhoneNumber(ticket.contact?.phone || '');

    let instanceName = ticket.instance?.instanceName;
    let targetInstanceId = ticket.instanceId;

    if (!instanceName) {
      const fallbackInstance = await prisma.waInstance.findFirst({
        where: { tenantId: req.user.tenantId, status: 'connected' }
      });
      instanceName = fallbackInstance?.instanceName;
      targetInstanceId = fallbackInstance?.id;
    }

    if (!instanceName) {
      const anyInstance = await prisma.waInstance.findFirst({
        where: { tenantId: req.user.tenantId }
      });
      instanceName = anyInstance?.instanceName;
      targetInstanceId = anyInstance?.id;
    }

    if (!instanceName) {
      return res.status(400).json({ error: 'Nenhuma conexão WhatsApp encontrada ou configurada para esta empresa.' });
    }

    // Se o ticket não tinha uma instância associada, vincula a que encontramos
    if (!ticket.instanceId && targetInstanceId) {
      await prisma.ticket.update({
        where: { id },
        data: { instanceId: targetInstanceId }
      });
    }

    const result = await evolutionService.sendText(evolutionUrl, evolutionKey, instanceName, phone, finalBody, quotedMsgId);
    const externalId = result?.key?.id || result?.message?.key?.id;

    // Auto-atribuição se o ticket não estiver aberto ou estiver sem agente
    if (ticket.status !== 'open' || !ticket.agentId) {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'open', agentId: req.user.userId, lastMessageAt: new Date() }
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
      data: { ticketId: id, agentId: req.user.userId, body, fromMe: true, externalId, quotedMsgId, quotedMsgBody },
    });

    // Atualiza lastMessageAt para ordenação da lista
    await prisma.ticket.update({ where: { id }, data: { lastMessageAt: new Date() } });
    res.json(message);
  } catch (err) {
    console.error('[sendMessage] erro:', err.response?.data || err.message);
    res.status(500).json({ error: 'Falha ao enviar mensagem: ' + (err.response?.data?.message || err.message) });
  }
}

async function sendMediaMessage(req, res) {
  const { id } = req.params;
  const file = req.file;
  const caption = req.body.caption || '';
  const quotedMsgId = req.body.quotedMsgId;

  if (!file) return res.status(400).json({ error: 'Arquivo obrigatório' });

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { contact: true, instance: true },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
    const evolutionUrl = settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
    const evolutionKey = settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;

    if (!evolutionUrl || !evolutionKey) {
      return res.status(400).json({ error: 'Integração com o WhatsApp (Evolution API) não configurada para esta empresa' });
    }

    const evolutionService = require('../services/evolutionService');

    const base64 = (await fs.promises.readFile(file.path)).toString('base64');
    const mime = file.mimetype;

    // Normaliza o número: se tiver 10 ou 11 dígitos, adiciona 55
    const phone = evolutionService.normalizePhoneNumber(ticket.contact?.phone || '');

    let instanceName = ticket.instance?.instanceName;
    let targetInstanceId = ticket.instanceId;

    if (!instanceName) {
      const fallbackInstance = await prisma.waInstance.findFirst({
        where: { tenantId: req.user.tenantId, status: 'connected' }
      });
      instanceName = fallbackInstance?.instanceName;
      targetInstanceId = fallbackInstance?.id;
    }

    if (!instanceName) {
      const anyInstance = await prisma.waInstance.findFirst({
        where: { tenantId: req.user.tenantId }
      });
      instanceName = anyInstance?.instanceName;
      targetInstanceId = anyInstance?.id;
    }

    if (!instanceName) {
      return res.status(400).json({ error: 'Nenhuma conexão WhatsApp encontrada ou configurada para esta empresa.' });
    }

    // Se o ticket não tinha uma instância associada, vincula a que encontramos
    if (!ticket.instanceId && targetInstanceId) {
      await prisma.ticket.update({
        where: { id },
        data: { instanceId: targetInstanceId }
      });
    }

    let mediaUrl = `/uploads/media/${file.filename}`;
    let mediaType = 'document';

    const agent = await prisma.user.findUnique({ where: { id: req.user.userId } });
    // Só adiciona o nome do agente se houver legenda ou se for imagem/vídeo
    const finalCaption = caption ? `*${agent?.name || 'Agente'}*\n${caption}` : `*${agent?.name || 'Agente'}*`;
    
    let quotedMsgBody = null;
    if (quotedMsgId) {
      const quoted = await prisma.message.findFirst({ where: { externalId: quotedMsgId } });
      if (quoted) quotedMsgBody = quoted.body;
    }

    let result;
    if (mime.startsWith('image/')) {
      mediaType = 'image';
      result = await evolutionService.sendMedia(evolutionUrl, evolutionKey, instanceName, phone, {
        mediatype: 'image', media: base64, mimetype: mime, filename: file.originalname, caption: finalCaption, quoted: quotedMsgId, filePath: file.path
      });
    } else if (mime.startsWith('audio/')) {
      mediaType = 'audio';
      try {
        const mediaService = require('../services/mediaService');
        const oldPath = file.path;
        const newPath = await mediaService.normalizeAudio(oldPath);
        const newFilename = path.basename(newPath);
        mediaUrl = `/uploads/media/${newFilename}`;
        const oggBase64 = (await fs.promises.readFile(newPath)).toString('base64');
        result = await evolutionService.sendAudio(evolutionUrl, evolutionKey, instanceName, phone, oggBase64, quotedMsgId);
      } catch (err) {
        console.error('[audioConvert] erro:', err.message);
        result = await evolutionService.sendAudio(evolutionUrl, evolutionKey, instanceName, phone, base64, quotedMsgId);
      }
    } else if (mime.startsWith('video/')) {
      mediaType = 'video';
      result = await evolutionService.sendMedia(evolutionUrl, evolutionKey, instanceName, phone, {
        mediatype: 'video', media: base64, mimetype: mime, filename: file.originalname, caption: finalCaption, quoted: quotedMsgId, filePath: file.path
      });
    } else {
      mediaType = 'document';
      // Para documentos, se não houver legenda extra, mandamos sem legenda para evitar erros na API
      const docCaption = caption ? finalCaption : undefined;
      result = await evolutionService.sendMedia(evolutionUrl, evolutionKey, instanceName, phone, {
        mediatype: 'document', 
        media: base64, 
        mimetype: mime,
        filename: file.originalname, 
        caption: docCaption, 
        quoted: quotedMsgId,
        filePath: file.path
      });
    }

    const externalId = result?.key?.id || result?.message?.key?.id;

    if (ticket.status !== 'open' || !ticket.agentId) {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'open', agentId: req.user.userId, lastMessageAt: new Date() }
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
        fileName: file.originalname,
        externalId,
        quotedMsgId,
        quotedMsgBody
      },
    });

    // Atualiza lastMessageAt para ordenação da lista
    await prisma.ticket.update({ where: { id }, data: { lastMessageAt: new Date() } });

    if (mediaType === 'audio' && settings?.geminiKey) {
      (async () => {
        try {
          const geminiService = require('../services/geminiService');
          // Usa path.resolve para evitar problemas de caminho relativo no background
          const audioPath = path.resolve(__dirname, '..', '..', 'uploads', 'media', path.basename(mediaUrl));
          if (!fs.existsSync(audioPath)) return;
          const audioBase64 = (await fs.promises.readFile(audioPath)).toString('base64');
          const transcription = await geminiService.transcribeAudio(settings.geminiKey, audioBase64, 'audio/ogg');
          if (transcription) {
            const updated = await prisma.message.update({ where: { id: message.id }, data: { transcription } });
            if (io) io.to(req.user.tenantId).emit('message_updated', { ticketId: id, message: updated });
          }
        } catch (err) {
          console.error('[agentTranscription] erro:', err.message);
        }
      })();
    }

    res.json(message);
  } catch (err) {
    console.error('[sendMediaMessage] erro:', err.response?.data || err.message);
    res.status(500).json({ error: 'Falha ao enviar mídia: ' + (err.response?.data?.message || err.message) });
  }
}

async function reopen(req, res) {
  const { contactId, crmCustomerId } = req.body;
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
      messages: { orderBy: { createdAt: 'asc' }, take: 100 },
        contact: { include: { crmCustomer: true } },
    },
  });

  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
  if (!settings?.geminiKey) return res.status(400).json({ error: 'IA não configurada para este tenant' });

  const geminiService = require('../services/geminiService');
  const history = getRecentConversation(ticket.messages, 24, 50);
  const prompt = `Resuma apenas a conversa mais recente, considerando no maximo as ultimas 24 horas de atendimento com ${ticket.contact.name || ticket.contact.phone}. Identifique o problema principal e o estado atual da resolucao. Seja conciso e use topicos.`;
  
  try {
    if (history.length === 0) {
      return res.json({ summary: 'Nao ha mensagens recentes nas ultimas 24 horas para resumir.' });
    }
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
    try {
      await evolutionService.revokeMessage(
        settings.evolutionUrl,
        settings.evolutionKey,
        message.ticket.instance.instanceName,
        message.ticket.contact.phone,
        message.externalId
      );
    } catch (waErr) {
      console.warn('[deleteMessage] falha ao revogar no WA (provavelmente tempo expirado):', waErr.message);
    }

    // Marca como apagada no banco
    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { isDeleted: true, body: '🚫 Mensagem apagada' }
    });

    res.json(updated);
  } catch (err) {
    console.error('[deleteMessage] erro crítico:', err.message);
    res.status(500).json({ error: 'Erro ao processar exclusão de mensagem' });
  }
}

async function linkContact(req, res) {
  const { id } = req.params;
  const { contactId, crmCustomerId } = req.body;
  const { tenantId } = req.user;

  try {
    const ticket = await prisma.ticket.findFirst({ where: { id, tenantId }, include: { contact: true } });
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    var sourceContactId = ticket.contactId;
    var whatsapp = ticket.contact.phone;

    if (req.body.unlinkCrm === true) {
      await prisma.contact.update({
        where: { id: sourceContactId },
        data: { crmCustomerId: null }
      });

      // Remove os equipamentos sincronizados do CRM do contato
      await prisma.equipment.deleteMany({
        where: {
          contactId: sourceContactId,
          externalSource: 'firebird'
        }
      });

      const updatedTicket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          contact: { include: { crmCustomer: true } },
          agent: { select: { name: true } },
          team: true,
          instance: { select: { instanceName: true } }
        }
      });

      await historyService.logEvent({
        ticketId: id,
        tenantId,
        userId: req.user.userId,
        type: 'crm_customer_unlinked',
        payload: { contactId: sourceContactId }
      });

      if (io) {
        io.to(tenantId).emit('ticket_updated', { ticketId: id, ticket: updatedTicket });
      }

      return res.json(updatedTicket);
    }

    if (crmCustomerId) {
      const targetCustomer = await prisma.crmCustomer.findFirst({ where: { id: crmCustomerId, tenantId } });
      if (!targetCustomer) return res.status(404).json({ error: 'Cliente CRM nao encontrado' });

      await prisma.contact.update({
        where: { id: sourceContactId },
        data: { crmCustomerId }
      });

      // Sincroniza os equipamentos do CRM para o contato imediatamente
      const { syncCrmEquipmentsToEquipment } = require('../services/crmSyncService');
      await syncCrmEquipmentsToEquipment(tenantId, sourceContactId);

      const updatedTicket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          contact: { include: { crmCustomer: true } },
          agent: { select: { name: true } },
          team: true,
          instance: { select: { instanceName: true } }
        }
      });

      await historyService.logEvent({
        ticketId: id,
        tenantId,
        userId: req.user.userId,
        type: 'crm_customer_linked',
        payload: { contactId: sourceContactId, crmCustomerId, whatsapp }
      });

      if (io) {
        io.to(tenantId).emit('ticket_updated', { ticketId: id, ticket: updatedTicket });
      }

      return res.json(updatedTicket);
    }

    const targetContact = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!targetContact) return res.status(404).json({ error: 'Contato de destino não encontrado' });

    var sourceContactId = ticket.contactId;
    var whatsapp = ticket.contact.phone; // O número atual do ticket

    // 1. NÃO reatribui o ticket para o contato do CRM. 
    // Em vez disso, mantemos o contato original do WhatsApp, mas vinculamos ele via telefone no CRM.
    
    // 2. Atualiza o WhatsApp do contato de destino (CRM) com o número de quem está falando
    const existingWithWa = await prisma.contact.findFirst({ where: { tenantId, whatsapp, NOT: { id: contactId } } });
    if (existingWithWa) {
      await prisma.contact.update({ where: { id: existingWithWa.id }, data: { whatsapp: null } });
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: { whatsapp }
    });

    // 3. Opcional: Podemos marcar no contato original qual o ID do CRM dele (usando um campo ou metadado)
    // Por enquanto, vamos usar a lógica de busca por telefone invertida.
    
    // Retorna o ticket atualizado (sem mudar o contactId)
    const updatedTicket = await prisma.ticket.findUnique({
      where: { id },
      include: { contact: { include: { crmCustomer: true } }, agent: { select: { name: true } }, team: true, instance: { select: { instanceName: true } } }
    });

    // 3. Log de evento
    await historyService.logEvent({
      ticketId: id,
      tenantId,
      userId: req.user.userId,
      type: 'contact_linked',
      payload: { fromId: sourceContactId, toId: contactId, whatsapp }
    });

    if (io) {
      io.to(tenantId).emit('ticket_updated', { ticketId: id, ticket: updatedTicket });
    }

    res.json(updatedTicket);
  } catch (err) {
    console.error('[linkContact] ERRO CRÍTICO:', err);
    res.status(500).json({ error: 'Erro ao vincular contato: ' + err.message });
  }
}

async function forwardMessage(req, res) {
  const { messageId, contactId } = req.body;
  const tenantId = req.user.tenantId;

  try {
    const originalMsg = await prisma.message.findUnique({
      where: { id: messageId },
      include: { ticket: { include: { contact: true, instance: true } } }
    });

    if (!originalMsg) return res.status(404).json({ error: 'Mensagem original não encontrada' });

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return res.status(404).json({ error: 'Contato de destino não encontrado' });

    // Encontra ou cria um ticket aberto para o contato
    let ticket = await prisma.ticket.findFirst({
      where: { contactId: contact.id, status: 'open', tenantId },
      include: { instance: true }
    });

    if (!ticket) {
      const instanceId = originalMsg.ticket?.instanceId || (await prisma.waInstance.findFirst({ where: { tenantId, status: 'connected' } }))?.id;
      if (!instanceId) return res.status(400).json({ error: 'Nenhuma instância disponível' });

      ticket = await prisma.ticket.create({
        data: { contactId: contact.id, instanceId, status: 'open', tenantId, agentId: req.user.userId },
        include: { instance: true }
      });
    }

    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
    const evolutionUrl = settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
    const evolutionKey = settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;

    if (!evolutionUrl || !evolutionKey) {
      return res.status(400).json({ error: 'Integração com o WhatsApp (Evolution API) não configurada para esta empresa' });
    }

    const evolutionService = require('../services/evolutionService');
    const agent = await prisma.user.findUnique({ where: { id: req.user.userId } });

    const phone = evolutionService.normalizePhoneNumber(contact.phone || '');

    let instanceName = ticket.instance?.instanceName;
    let targetInstanceId = ticket.instanceId;

    if (!instanceName) {
      const fallbackInstance = await prisma.waInstance.findFirst({
        where: { tenantId, status: 'connected' }
      });
      instanceName = fallbackInstance?.instanceName;
      targetInstanceId = fallbackInstance?.id;
    }

    if (!instanceName) {
      const anyInstance = await prisma.waInstance.findFirst({
        where: { tenantId }
      });
      instanceName = anyInstance?.instanceName;
      targetInstanceId = anyInstance?.id;
    }

    if (!instanceName) {
      return res.status(400).json({ error: 'Nenhuma conexão WhatsApp encontrada ou configurada para esta empresa.' });
    }

    // Se o ticket não tinha uma instância associada, vincula a que encontramos
    if (!ticket.instanceId && targetInstanceId) {
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { instanceId: targetInstanceId },
        include: { instance: true }
      });
    }

    let result;
    const body = originalMsg.body;
    const mediaUrl = originalMsg.mediaUrl;
    const mediaType = originalMsg.mediaType;

    if (mediaUrl) {
      const filePath = path.resolve(__dirname, '..', '..', mediaUrl.startsWith('/') ? mediaUrl.substring(1) : mediaUrl);
      if (fs.existsSync(filePath)) {
        const base64 = (await fs.promises.readFile(filePath)).toString('base64');
        const mimetype = getMimeTypeFromFileName(originalMsg.fileName, mediaType);
        
        const finalCaption = mediaType === 'audio' ? null : `*Encaminhado por ${agent?.name || 'Agente'}*\n${body || ''}`;

        if (mediaType === 'audio') {
           result = await evolutionService.sendAudio(evolutionUrl, evolutionKey, instanceName, phone, base64);
        } else {
           result = await evolutionService.sendMedia(evolutionUrl, evolutionKey, instanceName, phone, {
             mediatype: mediaType === 'document' ? 'document' : mediaType, 
             media: base64,
             mimetype,
             filename: originalMsg.fileName || `${mediaType || 'arquivo'}${path.extname(filePath) || ''}`,
             caption: finalCaption,
             filePath
            });
        }
      } else {
        return res.status(400).json({ error: 'Arquivo de mídia não encontrado no servidor' });
      }
    } else {
      const finalBody = `*Encaminhado por ${agent?.name || 'Agente'}*\n${body || ''}`;
      result = await evolutionService.sendText(evolutionUrl, evolutionKey, instanceName, phone, finalBody);
    }

    const externalId = result?.key?.id || result?.message?.key?.id;
    const newMessage = await prisma.message.create({
      data: {
        ticketId: ticket.id,
        agentId: req.user.userId,
        body: originalMsg.body,
        mediaUrl: originalMsg.mediaUrl,
        mediaType: originalMsg.mediaType,
        fromMe: true,
        externalId
      }
    });

    if (io) {
      io.to(tenantId).emit('new_message', { message: newMessage, ticket });
      io.to(tenantId).emit('ticket_updated', { ticketId: ticket.id });
    }

    res.json(newMessage);
  } catch (err) {
    console.error('[forwardMessage] erro:', err.message);
    res.status(500).json({ error: 'Erro ao encaminhar mensagem' });
  }
}

module.exports = { list, getMessages, assign, resolve, update, sendMessage, sendMediaMessage, deleteMessage, reopen, summarize, linkContact, forwardMessage, setIo };
