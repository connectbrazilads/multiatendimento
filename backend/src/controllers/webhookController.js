const prisma = require('../lib/prisma');
const path = require('path');
const fs = require('fs');
const evolutionService = require('../services/evolutionService');
const geminiService = require('../services/geminiService');
const businessHourService = require('../services/businessHourService');

let io;
function setIo(socketIo) { io = socketIo; }

const teamCache = new Map();
const knowledgeCache = new Map();

function getCacheEntry(cache, key, ttlMs) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCacheEntry(cache, key, value) {
  cache.set(key, { value, createdAt: Date.now() });
  return value;
}

async function getTeamsCached(tenantId) {
  const cached = getCacheEntry(teamCache, tenantId, 5 * 60 * 1000);
  if (cached) return cached;

  const teams = await prisma.team.findMany({ where: { tenantId } });
  return setCacheEntry(teamCache, tenantId, teams);
}

async function getKnowledgeCached(tenantId) {
  const cached = getCacheEntry(knowledgeCache, tenantId, 2 * 60 * 1000);
  if (cached) return cached;

  const knowledges = await prisma.knowledge.findMany({
    where: { tenantId, active: true, embedding: { not: null } },
    select: { id: true, question: true, answer: true, embedding: true }
  });

  return setCacheEntry(knowledgeCache, tenantId, knowledges);
}

function shouldUseKnowledgeSearch(message) {
  const normalized = (message || '').trim().toLowerCase();
  if (normalized.length < 18) return false;

  return normalized.includes('?')
    || normalized.includes('como')
    || normalized.includes('qual')
    || normalized.includes('quando')
    || normalized.includes('onde')
    || normalized.includes('porque')
    || normalized.includes('por que')
    || normalized.includes('procedimento')
    || normalized.includes('configur')
    || normalized.includes('instal')
    || normalized.includes('erro');
}

function isLikelyEquipmentModel(message) {
  const normalized = (message || '').trim();
  if (normalized.length < 4 || normalized.length > 40) return false;

  if (/\b(?:xerox|ricoh|kyocera|canon|hp|epson|brother|lexmark|sharp|konica|minolta|samsung)\b[\s\-]*[a-z0-9-]{2,}/i.test(normalized)) {
    return true;
  }

  return /\b[a-z]{1,6}[\s-]?[a-z]?\d{3,6}\b/i.test(normalized);
}

function shouldExtractClientMemory(message) {
  const normalized = (message || '').trim();
  if (!normalized) return false;

  if (/nome|modelo|serie|serial|setor|endereco|ramal|equipamento|impressora|copiadora|maquina|whatsapp|email/i.test(normalized)) {
    return true;
  }

  if (isLikelyEquipmentModel(normalized)) {
    return true;
  }

  return false;
}

function pickBestContactMatch(contacts, phoneCandidates, instanceId) {
  if (!Array.isArray(contacts) || contacts.length === 0) return null;

  const normalizedCandidates = new Set(phoneCandidates);

  const rankContact = (contact) => {
    const sameInstance = contact.instanceId === instanceId ? 100 : 0;
    const exactPhone = normalizedCandidates.has(contact.phone) ? 10 : 0;
    const exactWhatsapp = normalizedCandidates.has(contact.whatsapp) ? 5 : 0;
    const hasName = contact.name && contact.name !== '.' ? 2 : 0;
    return sameInstance + exactPhone + exactWhatsapp + hasName;
  };

  return [...contacts].sort((left, right) => {
    const scoreDiff = rankContact(right) - rankContact(left);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  })[0];
}

function getMessageContent(m) {
  if (!m) return null;
  if (m.ephemeralMessage) return getMessageContent(m.ephemeralMessage.message);
  if (m.viewOnceMessage) return getMessageContent(m.viewOnceMessage.message);
  if (m.viewOnceMessageV2) return getMessageContent(m.viewOnceMessageV2.message);
  if (m.documentWithCaptionMessage) return getMessageContent(m.documentWithCaptionMessage.message);
  return m;
}

function extractMedia(msg) {
  const m = getMessageContent(msg.message);
  if (!m) return null;
  
  // Debug log for media structure
  console.log('[webhook] Extracting media from:', JSON.stringify(m).substring(0, 500));

  if (m.imageMessage)    return { type: 'image',    caption: m.imageMessage.caption || '' };
  if (m.videoMessage)    return { type: 'video',    caption: m.videoMessage.caption || '' };
  if (m.audioMessage)    return { type: 'audio',    caption: '🎤 Áudio' };
  if (m.pttMessage)      return { type: 'audio',    caption: '🎤 Áudio' };
  if (m.documentMessage) return { type: 'document', caption: m.documentMessage.caption || '', fileName: m.documentMessage.fileName || 'Documento' };
  if (m.stickerMessage)  return { type: 'image',    caption: '' };
  return null;
}

function joinAiParts(parts = []) {
  return parts
    .map((part) => (part || '').toString().trim())
    .filter(Boolean)
    .join('\n');
}

function describeMessageForAi(message, fallbackText = '') {
  const body = (message?.body || '').trim();
  const transcription = (message?.transcription || '').trim();
  const mediaType = message?.mediaType;
  const fileName = (message?.fileName || '').trim();

  if (!mediaType) return body || fallbackText.trim();

  if (mediaType === 'image') {
    return joinAiParts([
      '[Cliente enviou uma foto/imagem.]',
      body ? `Legenda do cliente: ${body}` : '',
      transcription ? `Análise visual automática: ${transcription}` : '',
    ]);
  }

  if (mediaType === 'audio') {
    return joinAiParts([
      '[Cliente enviou um áudio.]',
      transcription ? `Transcrição do áudio: ${transcription}` : '',
    ]);
  }

  if (mediaType === 'video') {
    return joinAiParts([
      '[Cliente enviou um vídeo.]',
      body ? `Legenda do cliente: ${body}` : '',
      transcription ? `Resumo automático do vídeo: ${transcription}` : '',
    ]);
  }

  if (mediaType === 'document') {
    return joinAiParts([
      `[Cliente enviou um documento${fileName ? `: ${fileName}` : '.'}]`,
      body ? `Legenda do cliente: ${body}` : '',
      transcription ? `Conteúdo extraído: ${transcription}` : '',
    ]);
  }

  return joinAiParts([
    `[Cliente enviou uma mídia do tipo ${mediaType}.]`,
    body,
    transcription,
  ]) || fallbackText.trim();
}

function normalizeHistoryForAi(messages = []) {
  return messages
    .map((message) => {
      const aiBody = describeMessageForAi(message);
      return aiBody ? { ...message, body: aiBody } : null;
    })
    .filter(Boolean);
}

async function downloadMedia(settings, instanceName, msg, messageId) {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      console.log(`[media-download] [${instanceName}] Tentativa ${attempts + 1} para msg ${msg.key.id}...`);
      const result = await evolutionService.getMediaBase64(
        settings.evolutionUrl, settings.evolutionKey, instanceName, msg.key
      );
      
      const base64 = result?.base64 || result?.data?.base64;
      const mimetype = result?.mimetype || result?.data?.mimetype || result?.data?.data?.mimetype;
      
      if (base64) {
        console.log(`[media-download] [${instanceName}] Base64 obtido com sucesso para msg ${msg.key.id}. Tamanho: ${Math.round(base64.length/1024)}KB`);
        return evolutionService.saveMediaFile(base64, mimetype, messageId);
      } else {
        console.warn(`[media-download] [${instanceName}] Evolution não retornou base64 na tentativa ${attempts + 1}. Resposta:`, JSON.stringify(result).substring(0, 200));
      }
    } catch (err) {
      console.error(`[media-download] [${instanceName}] Erro na tentativa ${attempts + 1} para msg ${msg.key.id}:`, err.response?.data || err.message);
      
      // Se for erro de instância inexistente ou API key, não adianta tentar de novo
      if (err.response?.status === 401 || err.response?.status === 403 || (err.response?.data?.message || '').includes('not found')) {
        return null;
      }
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.error(`[media-download] [${instanceName}] Falha definitiva após ${maxAttempts} tentativas para msg ${msg.key.id}`);
  return null;
}

async function processSingleMessage(msg, instance, waInstance, tenant, isHistorical) {
  const externalId = msg.key?.id;
  const fromMe = msg.key?.fromMe === true;

  // Se já existe no banco, ignora (evita duplicar o que o sistema enviou)
  const existing = await prisma.message.findFirst({ where: { externalId } });
  if (existing) return;

  const remoteJid = msg.key?.remoteJid || '';
  if (remoteJid === 'status@broadcast') return;

  const isGroup = evolutionService.isGroupJid(remoteJid);
  const phone = isGroup
    ? evolutionService.normalizePhoneNumber(remoteJid)
    : evolutionService.normalizePhoneNumber(remoteJid.replace('@s.whatsapp.net', ''));

  const media = extractMedia(msg);
  const mContent = getMessageContent(msg.message);
  
  // Tentativa robusta de pegar o texto (body) da mensagem
  let body = mContent?.conversation
    || mContent?.extendedTextMessage?.text
    || mContent?.imageMessage?.caption
    || mContent?.videoMessage?.caption
    || mContent?.documentMessage?.caption
    || media?.caption
    || '';

  if (!body) {
    if (mContent?.contactMessage) {
      const name = mContent.contactMessage.displayName || 'Desconhecido';
      const vcard = mContent.contactMessage.vcard || '';
      const phoneMatch = vcard.match(/waid=([0-9]+)/) || vcard.match(/TEL.*:.*?\+?([0-9\-\s]+)/);
      let phoneText = '';
      if (phoneMatch) {
        const number = phoneMatch[1].replace(/\D/g, '');
        phoneText = `\n📱 +${number}\n🔗 https://wa.me/${number}`;
      }
      body = `👤 Contato: ${name}${phoneText}`;
    } else if (mContent?.contactsArrayMessage) {
      body = `👥 ${mContent.contactsArrayMessage.contacts?.length || 'Vários'} Contato(s)\n*(Abra no celular para salvar)*`;
    } else if (mContent?.locationMessage) {
      body = mContent.locationMessage.name ? `📍 Localização: ${mContent.locationMessage.name}` : `📍 Localização`;
    }
  }

  if (isGroup && !fromMe && body) {
    const participant = msg.key?.participant || msg.participant || '';
    const senderLabel = msg.pushName
      || evolutionService.normalizePhoneNumber(participant.replace('@s.whatsapp.net', ''))
      || 'Participante';
    body = `${senderLabel}: ${body}`;
  }

  const contextInfo = mContent?.extendedTextMessage?.contextInfo 
                   || mContent?.imageMessage?.contextInfo
                   || mContent?.videoMessage?.contextInfo
                   || mContent?.audioMessage?.contextInfo
                   || mContent?.documentMessage?.contextInfo
                   || mContent?.documentWithCaptionMessage?.message?.documentMessage?.contextInfo;
  
  const quotedMsgId = contextInfo?.stanzaId;
  const qContent = getMessageContent(contextInfo?.quotedMessage);
  const quotedMsgBody = qContent?.conversation 
                     || qContent?.extendedTextMessage?.text
                     || qContent?.imageMessage?.caption
                     || qContent?.videoMessage?.caption
                     || (qContent?.audioMessage ? '🎤 Áudio' : null)
                     || (qContent?.documentMessage ? '📎 Documento' : null)
                     || (qContent?.contactMessage ? `👤 Contato: ${qContent.contactMessage.displayName || 'Desconhecido'}` : null)
                     || (qContent?.locationMessage ? '📍 Localização' : null);

  if (!phone || (!body && !media)) return;
  console.log(`[webhook] mensagem ${fromMe ? 'ENVIADA para' : 'RECEBIDA de'} ${phone}: "${body}" ${media ? `[${media.type}]` : ''} | isHistorical: ${isHistorical}`);

  const phoneCandidates = evolutionService.buildPhoneLookupCandidates(phone);
  const matchingContacts = await prisma.contact.findMany({
    where: {
      tenantId: tenant.id,
      OR: [
        { phone: { in: phoneCandidates } },
        { whatsapp: { in: phoneCandidates } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  const matchedContact = pickBestContactMatch(matchingContacts, phoneCandidates, waInstance.id);

  let contact;
  if (matchedContact) {
    const shouldUpdateName = !isGroup && !fromMe && msg.pushName && (!matchedContact.name || matchedContact.name === '.');
    const nextContactData = {
      ...(matchedContact.phone !== phone ? { phone } : {}),
      ...(matchedContact.instanceId !== waInstance.id ? { instanceId: waInstance.id } : {}),
      ...(shouldUpdateName ? { name: msg.pushName } : {}),
    };

    contact = Object.keys(nextContactData).length > 0
      ? await prisma.contact.update({
          where: { id: matchedContact.id },
          data: nextContactData,
        })
      : matchedContact;
  } else {
    contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        instanceId: waInstance.id,
        phone,
        name: isGroup ? `Grupo ${phone.split('@')[0]}` : (fromMe ? null : (msg.pushName || null)),
      },
    });
  }

  // Busca foto de perfil em background se ainda não tiver
  if (!contact.avatarUrl && tenant.settings?.evolutionUrl && tenant.settings?.evolutionKey) {
    evolutionService.fetchProfilePicture(tenant.settings.evolutionUrl, tenant.settings.evolutionKey, instance, phone)
      .then(async (picture) => {
        if (picture) await prisma.contact.update({ where: { id: contact.id }, data: { avatarUrl: picture } });
      })
      .catch(() => {});
  }

  // --- Lógica de Avaliação de Atendimento (CSAT) ---
  const bodyTrim = (body || '').trim();
  const isRating = /^[1-5]$/.test(bodyTrim);
  if (!isGroup && isRating && !isHistorical) {
    const lastResolved = await prisma.ticket.findFirst({
      where: { 
        contactId: contact.id, 
        status: 'resolved',
        rating: null,
        tenantId: tenant.id
      },
      orderBy: { resolvedAt: 'desc' }
    });

    // Se foi encerrado nas últimas 24h, gravamos a nota
    if (lastResolved && (new Date() - new Date(lastResolved.resolvedAt) < 24 * 60 * 60 * 1000)) {
      await prisma.ticket.update({
        where: { id: lastResolved.id },
        data: { 
          rating: parseInt(bodyTrim),
          ratingAt: new Date()
        }
      });
      
      await evolutionService.sendText(tenant.settings.evolutionUrl, tenant.settings.evolutionKey, instance, phone, "Obrigado por sua avaliação! 🙏 Sua nota é muito importante para nós.");
      return;
    }
  }

  // 2. BUSCA OU CRIAÇÃO DE TICKET (Lógica Anti-Duplicação)
  let ticket = await prisma.ticket.findFirst({
    where: { contactId: contact.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!ticket) {
    ticket = await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        instanceId: waInstance.id,
        contactId: contact.id,
        status: fromMe ? 'open' : (!isGroup && tenant.settings?.botEnabled ? 'bot' : 'pending'),
      }
    });
    if (io) io.to(tenant.id).emit('new_ticket', ticket);
  } else if (ticket.instanceId !== waInstance.id) {
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { instanceId: waInstance.id, updatedAt: new Date() }
    });
  }

  if (ticket.status === 'resolved') {
    // Se o ticket já existia mas estava resolvido, REABRE ele para evitar duplicação na lista
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: !isGroup && tenant.settings?.botEnabled ? 'bot' : 'pending', updatedAt: new Date(), lastMessageAt: new Date(), unreadCount: { increment: 1 } }
    });
    if (io) io.to(tenant.id).emit('ticket_updated', ticket);
    console.log(`[webhook] Ticket ${ticket.id} reaberto para evitar duplicação.`);
  } else if (!fromMe) {
    // Incrementa unreadCount para mensagens de clientes em tickets já abertos
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { unreadCount: { increment: 1 }, updatedAt: new Date(), lastMessageAt: new Date() }
    });
    if (io) io.to(tenant.id).emit('ticket_updated', ticket);
  } else {
    // Mensagem enviada pelo agente (ex: pelo celular)
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date(), lastMessageAt: new Date() }
    });
    if (io) io.to(tenant.id).emit('ticket_updated', ticket);
  }

  const message = await prisma.message.create({
    data: {
      ticketId: ticket.id,
      body: body || media?.caption || '',
      fromMe,
      fromBot: false,
      mediaType: media?.type || null,
      fileName: media?.fileName || null,
      externalId,
      quotedMsgId,
      quotedMsgBody
    },
  });

  if (fromMe && ticket.status !== 'open') {
    const isBotMsg = await prisma.message.findFirst({
      where: { externalId, fromBot: true }
    });

    if (!isBotMsg) {
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'open' }
      });
    }
  }

  // --- Lógica de Horário de Atendimento ---
  if (!isHistorical) {
    const isWorking = await businessHourService.isWithinBusinessHours(tenant.id);
    if (!isGroup && !isWorking && !fromMe && tenant.settings?.outOfOfficeMessage) {
       const lastOooEvent = await prisma.ticketEvent.findFirst({
         where: { ticketId: ticket.id, type: 'ooo_message' },
         orderBy: { createdAt: 'desc' }
       });
       
       const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
       if (!lastOooEvent || lastOooEvent.createdAt < fourHoursAgo) {
          await evolutionService.sendText(
            tenant.settings.evolutionUrl,
            tenant.settings.evolutionKey,
            instance,
            phone,
            tenant.settings.outOfOfficeMessage
          );
          await prisma.ticketEvent.create({
            data: { ticketId: ticket.id, tenantId: tenant.id, type: 'ooo_message' }
          });
       }
    }
  }

  // Download de mídia e Transcrição em background
  if (media) {
    downloadMedia(tenant.settings, instance, msg, message.id).then(async (mediaUrl) => {
      if (!mediaUrl) {
        await prisma.message.update({
          where: { id: message.id },
          data: { mediaStatus: 'failed' }
        });
        if (io) io.to(tenant.id).emit('message_updated', {
          ticket,
          message: { id: message.id, mediaStatus: 'failed' },
          contact
        });
        return;
      }

      let transcription = null;
      const fullPath = path.join(__dirname, '../../', mediaUrl);

      if (media.type === 'audio' && tenant.settings?.geminiKey) {
        try {
          if (fs.existsSync(fullPath)) {
            const audioBase64 = (await fs.promises.readFile(fullPath)).toString('base64');
            const mimeType = mediaUrl.endsWith('.mp3') ? 'audio/mp3' : 'audio/ogg';
            transcription = await geminiService.transcribeAudio(tenant.settings.geminiKey, audioBase64, mimeType);
          }
        } catch (err) { console.error('[transcription] erro:', err.message); }
      }

      if (media.type === 'image' && tenant.settings?.geminiKey) {
        try {
          if (fs.existsSync(fullPath)) {
            const imgBase64 = (await fs.promises.readFile(fullPath)).toString('base64');
            const mimeType = mediaUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
            console.log('[vision] analisando imagem...');
            transcription = await geminiService.analyzeImage(
              tenant.settings.geminiKey,
              imgBase64,
              mimeType,
              'Você está analisando uma foto enviada em um atendimento técnico de impressora. Descreva apenas o que é visível na impressão e destaque defeitos como sombra, repetição, manchas, desalinhamento, falha de cor, faixa, borrado ou marcas. Responda em português, de forma objetiva, em até 3 frases.'
            );
            console.log('[vision] resultado:', transcription?.substring(0, 50));
          }
        } catch (err) { console.error('[vision] erro:', err.message); }
      }

      const updated = await prisma.message.update({
        where: { id: message.id },
        data: { 
          mediaUrl,
          mediaStatus: 'ok',
          transcription
        },
      });
      
      if (io) io.to(tenant.id).emit('message_updated', { ticket, message: updated, contact });

      if (!isHistorical && ticket.status === 'bot' && tenant.settings?.botEnabled && transcription) {
        if (pendingReplies[ticket.id]) clearTimeout(pendingReplies[ticket.id]);
        
        pendingReplies[ticket.id] = setTimeout(async () => {
          try {
            await handleBotReply(tenant, waInstance, ticket, contact, transcription, updated);
            delete pendingReplies[ticket.id];
          } catch (err) {
            console.error('[bot-media-debounce] erro:', err.message);
            delete pendingReplies[ticket.id];
          }
        }, 12000);
      }
    }).catch(err => console.error('[webhook] erro ao processar mídia:', err.message));
  }

  if (io) {
    const freshTicket = await prisma.ticket.findUnique({ 
      where: { id: ticket.id },
      include: { contact: true, agent: { select: { name: true } }, instance: { select: { instanceName: true } } }
    });
    console.log(`[socket] emitindo new_message para tenant ${tenant.id} | Ticket: ${freshTicket.id} | Status: ${freshTicket.status}`);
    io.to(tenant.id).emit('new_message', { ticket: freshTicket, message, contact });
  } else {
    console.warn('[socket] aviso: objeto io não inicializado no webhookController');
  }

  if (!isHistorical && ticket.status === 'bot' && tenant.settings?.botEnabled && tenant.settings?.geminiKey && !fromMe) {
    console.log(`[bot] Iniciando debounce para ticket ${ticket.id} (12s)...`);
    if (pendingReplies[ticket.id]) {
      clearTimeout(pendingReplies[ticket.id]);
    }

    pendingReplies[ticket.id] = setTimeout(async () => {
      try {
        console.log(`[bot] Executando resposta para ticket ${ticket.id}`);
        if (ticket.status === 'bot' && tenant.settings?.botEnabled && !fromMe && !media) {
          await handleBotReply(tenant, waInstance, ticket, contact, body, message);
        } else if (media?.type === 'image' || media?.type === 'audio') {
          console.log(`[bot] Mídia detectada, aguardando transcrição/visão para responder.`);
        }
        delete pendingReplies[ticket.id];
      } catch (err) {
        console.error('[bot-debounce] erro fatal:', err.message);
        delete pendingReplies[ticket.id];
      }
    }, 12000);
  } else if (ticket.status !== 'bot' && !fromMe) {
    console.log(`[bot] Ignorado: Ticket ${ticket.id} está com status "${ticket.status}" (não é bot).`);
  }
}

async function handleWebhook(req, res) {
  res.sendStatus(200);

  try {
    const { event, instance, data } = req.body;
    const ev = String(event || '').toLowerCase();
    
    // Trata atualização de conexão e QR Code
    if (ev === 'connection.update' || ev === 'qrcode.updated') {
      const waInstance = await prisma.waInstance.findFirst({ where: { instanceName: instance } });
      if (waInstance) {
        if (io) io.to(waInstance.tenantId).emit('connection_update', { instance, event, data });
        
        // Se a conexão caiu, avisa o admin
        if (ev === 'connection.update' && (data.state === 'close' || data.state === 'connecting')) {
          const { sendSystemAlert } = require('../services/alertService');
          sendSystemAlert(waInstance.tenantId, `A conexão *${instance.split('_')[1] || instance}* foi desconectada. Verifique o painel para reconectar.`);
        }
      }
      return;
    }

    // Trata exclusão de mensagens
    if (ev === 'messages.delete' || ev === 'messages.update') {
      const key = data?.key || data?.message?.key || data;
      if (key?.id) {
        const msgToUpdate = await prisma.message.findFirst({
          where: { externalId: key.id },
          include: { ticket: true }
        });
        
        if (msgToUpdate) {
          const updated = await prisma.message.update({
            where: { id: msgToUpdate.id },
            data: { isDeleted: true }
          });
          if (io) io.to(msgToUpdate.ticket.tenantId).emit('message_updated', { message: updated });
        }
      }
      return;
    }

    if (ev !== 'messages.upsert' && ev !== 'messages.set') return;

    const messages = Array.isArray(data?.messages) ? data.messages : (data ? [data] : []);
    if (messages.length === 0) return;

    const waInstance = await prisma.waInstance.findFirst({ where: { instanceName: instance } });
    if (!waInstance) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: waInstance.tenantId },
      include: { settings: true },
    });
    if (!tenant) return;

    const maxAgeMs = 2 * 24 * 60 * 60 * 1000; // 2 dias (48 horas)

    for (const msg of messages) {
      const msgTimeSec = msg.messageTimestamp || msg.key?.messageTimestamp || null;
      const msgTimeMs = msgTimeSec ? (parseInt(msgTimeSec) * 1000) : Date.now();
      const ageMs = Date.now() - msgTimeMs;

      // Ignora mensagens muito antigas (mais de 2 dias), para recuperar apenas o período offline curto
      if (ageMs > maxAgeMs) {
        console.log(`[webhook] Ignorando mensagem histórica antiga ${msg.key?.id || 'sem-id'} (idade: ${Math.round(ageMs / (1000 * 60 * 60))} horas, limite de 48h).`);
        continue;
      }

      // Se o evento for messages.set ou a mensagem tiver mais de 5 minutos, é considerada histórica
      const isHistorical = ev === 'messages.set' || ageMs > 5 * 60 * 1000;
      await processSingleMessage(msg, instance, waInstance, tenant, isHistorical);
    }
  } catch (err) {
    console.error('[webhook] erro:', err.message);
  }
}

const pendingReplies = {};

async function handleAutoTagging(tenant, ticket, contact) {
  try {
    const history = await prisma.message.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
      take: 10
    });
    
    const tags = await geminiService.generateTags(tenant.settings.geminiKey, history);
    if (tags.length > 0) {
      console.log(`[webhook] auto-tags para ${contact.phone}:`, tags);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { tags: JSON.stringify(tags) }
      });
      if (io) io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id });
    }
  } catch (err) {
    console.error('[autoTagging] erro:', err.message);
  }
}

async function handleBotReply(tenant, waInstance, ticket, contact, userMessage, incomingMessage) {
  const settings = tenant.settings;
  const transferWord = settings.botTransferWord || 'humano';
  const currentNotes = contact.notes || '';
  const currentUserTurn = describeMessageForAi(incomingMessage, userMessage);

  if (currentUserTurn.toLowerCase().includes(transferWord.toLowerCase())) {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'pending' } });
    if (io) io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id, status: 'pending' });
    return;
  }

  // 1. FILTRO DE PALAVRAS-CHAVE (ATALHO RÁPIDO)
  let autoCategory = null;
  const msgLower = currentUserTurn.toLowerCase();
  if (msgLower.includes('boleto') || msgLower.includes('nota') || msgLower.includes('pagamento')) autoCategory = 'FINANCEIRO';
  if (msgLower.includes('toner') || msgLower.includes('tonner') || msgLower.includes('cilindro')) autoCategory = 'SUPRIMENTO';
  if (msgLower.includes('falha') || msgLower.includes('não imprime') || msgLower.includes('parou')) autoCategory = 'SUPORTE';

  // 2. MEMÓRIA DE LONGO PRAZO (Filtra mensagens de alucinação anteriores para não "viciar" a IA)
  const history = await prisma.message.findMany({
    where: { ticket: { contactId: contact.id }, id: { not: incomingMessage.id } },
    orderBy: { createdAt: 'desc' },
    take: 15, 
  });
  
  // Remove do histórico mensagens onde o robô deu as opções "1 - Chamados Técnico", etc.
  const cleanHistory = history.filter(m => {
    if (!m.fromBot) return true;
    const body = m.body.toLowerCase();
    if (body.includes('chamados técnico') || body.includes('financeiro') || body.includes('opções que tenho disponíveis')) return false;
    return true;
  });

  const reversedHistory = normalizeHistoryForAi([...cleanHistory].reverse());

  // 3. SYSTEM PROMPT (Prioridade absoluta para o que o usuário escreveu no painel)
  const userPrompt = settings.botSystemPrompt || 'Você é um Assistente de Atendimento cordial.';

  // Sincroniza os equipamentos do CRM para o contato antes de buscar
  const { syncCrmEquipmentsToEquipment } = require('../services/crmSyncService');
  await syncCrmEquipmentsToEquipment(tenant.id, contact.id);

  // 4. CONTEXTO TÉCNICO (Equipamentos e Notas)
  const equipments = await prisma.equipment.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      contactId: contact.id
    }
  });

  const equipContext = equipments.length > 0 
    ? equipments.map(e => `- ${e.manufacturer || ''} ${e.model} (Série: ${e.serialNumber || 'N/A'}, Setor: ${e.sector || 'N/A'})`).join('\n')
    : 'Nenhum equipamento cadastrado para este cliente.';

  const technicalInstructions = `
---
[INSTRUÇÕES DE FLUXO DE SISTEMA - PRIORITÁRIO]:
1. Você é o Assistente Virtual da LCD DIGITAL.
2. [IDENTIFICAÇÃO DE CLIENTE & SETOR]:
   - Nome: Verifique o nome registrado ("${contact.name || ''}"). Se for vazio, genérico, ou apenas um caractere, pergunte o nome da pessoa de forma simpática. 
   - Setor: Pergunte em qual setor ou departamento o equipamento está localizado, a menos que conste nas NOTAS ATUAIS.
   - ATENÇÃO MÁXIMA: NUNCA repita a pergunta sobre Nome e Setor se você já perguntou nas mensagens anteriores recentes, ou se o cliente já respondeu. Considere as informações já dadas no contexto da conversa. NUNCA pergunte o que já foi respondido.
   - Não seja invasivo ou robótico. Faça as perguntas integradas ao diálogo de forma natural.
3. Ao receber pedidos de TONER ou SUPORTE:
   - Verifique a lista [EQUIPAMENTOS DO CLIENTE] abaixo.
   - Se houver equipamentos na lista: Você DEVE listar o modelo de cada um e perguntar: "Para qual destas máquinas você precisa de [solicitação]?". NUNCA peça o modelo se ele já estiver na lista.
   - Se a lista estiver vazia: Pergunte educadamente qual o modelo da máquina.
   - ATENÇÃO MÁXIMA: Se você já fez essa pergunta ou se o cliente já informou o modelo no histórico recente, NUNCA peça o modelo novamente.
   - Se o cliente já enviou foto, vídeo, áudio ou documento no histórico recente, NUNCA peça o anexo novamente. Só peça novo se o arquivo for insuficiente, explicando o que faltou.
4. [VALIDAÇÃO DE COR]: Se a máquina for COLORIDA (verifique no campo "Tipo" ou pelo conhecimento do modelo, ex: Xerox 7845, Ricoh C3003), você DEVE perguntar quais cores de toner o cliente precisa (Ciano, Magenta, Amarelo ou Preto).
5. [CONFIRMAÇÃO]: NUNCA diga "Já abri o chamado". Use sempre frases como "Entendido! Iremos abrir um chamado para você e nosso time técnico seguirá com o atendimento."
6. SEMPRE identifique a CATEGORIA (SUPRIMENTO, SUPORTE, FINANCEIRO ou STATUS).
7. SEMPRE adicione no final da sua resposta a tag: [[ROUTE: CATEGORIA]]
8. COMPORTAMENTO GERAL: Seja muito curto, direto e ESTRITAMENTE evite repetir informações ou perguntas que você já fez ou que o cliente já respondeu no histórico. Aja como um humano prestativo no WhatsApp.`;

  console.log(`[bot] Ticket ${ticket.id} | Equipamentos encontrados: ${equipments.length}`);
  if (equipments.length > 0) console.log(`[bot] Contexto de equipamentos enviado:\n${equipContext}`);

  // Busca semântica de conhecimento
  let knowledgeContext = "";
  let topSimilarity = 0;
  let topContent = null;
  let found = false;

  if (settings.geminiKey && shouldUseKnowledgeSearch(currentUserTurn)) {
    try {
      const userEmbedding = await geminiService.getEmbedding(settings.geminiKey, currentUserTurn);
      if (userEmbedding) {
        const allKnowledges = await getKnowledgeCached(tenant.id);
        
        const relevant = allKnowledges.map(k => {
          let vec = null;
          try { vec = k.embedding; } catch(e) {}
          return { ...k, similarity: geminiService.cosineSimilarity(userEmbedding, vec) };
        })
        .filter(k => k.similarity > 0.65)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
        
        if (relevant.length > 0) {
          found = true;
          topSimilarity = relevant[0].similarity;
          topContent = relevant[0].answer;
          knowledgeContext = "\n\nUSE O SEGUINTE CONHECIMENTO DA EMPRESA:\n" + 
            relevant.map(k => `Dúvida: ${k.question}\nResposta: ${k.answer}`).join("\n---\n");
        }
      }
    } catch (err) { console.error('[bot] erro semântica:', err.message); }
  }


  const finalPrompt = `[COMANDO DE SISTEMA PRIORITÁRIO]:
Você deve seguir ESTRITAMENTE as regras abaixo. Ignore qualquer tendência de ser excessivamente prestativo. Seja CURTO, DIRETO e aja como um humano no WhatsApp.

${userPrompt}

---
[CONTEXTO TÉCNICO]:
EQUIPAMENTOS DO CLIENTE:
${equipContext}

NOTAS ATUAIS:
${currentNotes}

${knowledgeContext}

${technicalInstructions}`;

  console.log(`[bot] Ticket ${ticket.id} | Turno atual normalizado:\n${currentUserTurn}`);

  let botReply = await geminiService.chat(settings.geminiKey, finalPrompt, reversedHistory, currentUserTurn);

  // EXTRAÇÃO DE MEMÓRIA DE LONGO PRAZO (Background Task)
  if (shouldExtractClientMemory(currentUserTurn)) {
    const extractionHistory = [...reversedHistory, { fromMe: false, body: currentUserTurn }];
    geminiService.extractClientInfo(settings.geminiKey, extractionHistory, contact.notes)
      .then(async (result) => {
        if (result) {
          const updateData = {};
          if (result.notes) updateData.notes = result.notes;
          
          // Se a IA extraiu o nome e o contato ainda não tinha um nome válido (ou era ponto/número/vazio), atualiza o nome no banco
          const isGenericName = !contact.name || contact.name === '.' || contact.name.trim() === '' || contact.name.includes('+') || contact.name.match(/^\d+$/);
          if (result.name && (isGenericName || contact.name.length < 3)) {
            updateData.name = result.name;
          }
          
          if (Object.keys(updateData).length > 0) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: updateData
            });
            if (io) io.to(tenant.id).emit('contact_updated', { contactId: contact.id });
          }
        }
      })
      .catch(err => console.error('[webhook] erro na extração de memória:', err.message));
  }

  // 4. LÓGICA DE ROTEAMENTO E SALVAMENTO
  const routeMatch = botReply.match(/\[\[ROUTE:\s*(.*?)\]\]/);
  const category = autoCategory || (routeMatch ? routeMatch[1].toUpperCase() : 'SUPORTE');
  
  botReply = botReply.replace(/\[\[ROUTE:.*?\]\]/g, '').trim();

  // Adiciona o nome do Robô na mensagem do WhatsApp
  const botName = settings.botName || 'ROBÔ';
  const finalMessageBody = `*${botName}*\n${botReply}`;

  // Executa o Roteamento
  const teams = await getTeamsCached(tenant.id);
  let targetTeam = null;

  if (category === 'FINANCEIRO') targetTeam = teams.find(t => t.name.toLowerCase().includes('financeiro'));
  else targetTeam = teams.find(t => t.name.toLowerCase().includes('atendimento'));

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { 
      teamId: targetTeam?.id,
      priority: category === 'SUPORTE' ? 'high' : 'medium'
    }
  });

  // Atualização de tags automáticas DESATIVADA
  /*
  let currentTags = [];
  try { currentTags = JSON.parse(contact.tags || '[]'); } catch(e) {}
  if (!currentTags.includes(category)) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { tags: JSON.stringify([...currentTags, category]) }
    });
  }
  */

  // Auditoria
  try {
    await prisma.knowledgeLog.create({
      data: {
        tenantId: tenant.id,
        query: currentUserTurn,
        content: topContent,
        similarity: topSimilarity,
        found
      }
    });
  } catch (err) { console.error('[log] erro ao gravar auditoria:', err.message); }

  const sent = await evolutionService.sendText(settings.evolutionUrl, settings.evolutionKey, waInstance.instanceName, contact.phone, finalMessageBody);
  const externalId = sent?.key?.id || sent?.id;

  const botMessage = await prisma.message.create({
    data: { 
      ticketId: ticket.id, 
      body: botReply, 
      fromMe: true, 
      fromBot: true,
      externalId // Guardamos o ID para saber que FOI O ROBÔ que mandou
    },
  });

  // Notifica o painel em tempo real sobre a nova mensagem do robô
  if (io) {
    const freshTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: { contact: true }
    });
    io.to(tenant.id).emit('new_message', { ticket: freshTicket, message: botMessage, contact });
    io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id });
  }
}

module.exports = { handleWebhook, setIo, processSingleMessage };
