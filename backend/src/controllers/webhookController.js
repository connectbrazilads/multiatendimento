const prisma = require('../lib/prisma');
const path = require('path');
const fs = require('fs');
const evolutionService = require('../services/evolutionService');
const geminiService = require('../services/geminiService');
const businessHourService = require('../services/businessHourService');

let io;
function setIo(socketIo) { io = socketIo; }

function extractMedia(msg) {
  const m = msg.message;
  if (!m) return null;
  if (m.imageMessage)    return { type: 'image',    caption: m.imageMessage.caption || '' };
  if (m.videoMessage)    return { type: 'video',    caption: m.videoMessage.caption || '' };
  if (m.audioMessage)    return { type: 'audio',    caption: '🎤 Áudio' };
  if (m.pttMessage)      return { type: 'audio',    caption: '🎤 Áudio' };
  if (m.documentMessage) return { type: 'document', caption: m.documentMessage.fileName || '📎 Documento' };
  if (m.stickerMessage)  return { type: 'image',    caption: '' };
  return null;
}

async function downloadMedia(settings, instanceName, msg, messageId) {
  try {
    const result = await evolutionService.getMediaBase64(
      settings.evolutionUrl, settings.evolutionKey, instanceName, msg.key
    );
    const base64 = result?.base64 || result?.data?.base64;
    const mimetype = result?.mimetype || result?.data?.mimetype || 'application/octet-stream';
    if (!base64) return null;
    return evolutionService.saveMediaFile(base64, mimetype, messageId);
  } catch (err) {
    console.error('[webhook] erro ao baixar mídia:', err.message);
    return null;
  }
}

async function handleWebhook(req, res) {
  res.sendStatus(200);

  try {
    const { event, instance, data } = req.body;
    
    // Trata atualização de conexão e QR Code
    if (event === 'connection.update' || event === 'qrcode.updated') {
      const waInstance = await prisma.waInstance.findFirst({ where: { instanceName: instance } });
      if (waInstance) {
        if (io) io.to(waInstance.tenantId).emit('connection_update', { instance, event, data });
        
        // Se a conexão caiu, avisa o admin
        if (event === 'connection.update' && (data.state === 'close' || data.state === 'connecting')) {
          const { sendSystemAlert } = require('../services/alertService');
          sendSystemAlert(waInstance.tenantId, `A conexão *${instance.split('_')[1] || instance}* foi desconectada. Verifique o painel para reconectar.`);
        }
      }
      return;
    }

    // Trata exclusão de mensagens
    if (event === 'messages.delete' || event === 'messages.update') {
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

    if (event !== 'messages.upsert') return;

    const msg = data?.messages?.[0] || data;
    if (!msg) return;

    const externalId = msg.key?.id;
    const fromMe = msg.key?.fromMe === true;

    // Se já existe no banco, ignora (evita duplicar o que o sistema enviou)
    const existing = await prisma.message.findFirst({ where: { externalId } });
    if (existing) return;

    const remoteJid = msg.key?.remoteJid || '';
    if (remoteJid.includes('@g.us')) return;
    if (remoteJid === 'status@broadcast') return;

    const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');

    const media = extractMedia(msg);
    const body = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || media?.caption
      || '';

    // Trata atualização de conexão e QR Code
    if (event === 'connection.update' || event === 'qrcode.updated') {
      return;
    }

    if (!phone || (!body && !media)) return;
    console.log(`[webhook] mensagem ${fromMe ? 'ENVIADA para' : 'RECEBIDA de'} ${phone}: "${body}" ${media ? `[${media.type}]` : ''}`);

    const waInstance = await prisma.waInstance.findFirst({ where: { instanceName: instance } });
    if (!waInstance) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: waInstance.tenantId },
      include: { settings: true },
    });
    if (!tenant) return;

    // Trata eventos de sistema (após identificar tenant)
    if (event === 'connection.update' || event === 'qrcode.updated') {
      if (io) io.to(tenant.id).emit('connection_update', { instance, event, data });
      return;
    }

    const contact = await prisma.contact.upsert({
      where: { tenantId_instanceId_phone: { tenantId: tenant.id, instanceId: waInstance.id, phone } },
      update: { name: fromMe ? undefined : (msg.pushName || undefined) },
      create: { tenantId: tenant.id, instanceId: waInstance.id, phone, name: msg.pushName },
    });

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
    if (isRating) {
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
        return res.json({ ok: true });
      }
    }

    let ticket = await prisma.ticket.findFirst({
      where: { contactId: contact.id, status: { in: ['pending', 'open', 'bot'] } },
    });

    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          tenantId: tenant.id,
          instanceId: waInstance.id,
          contactId: contact.id,
          status: fromMe ? 'open' : (tenant.settings?.botEnabled ? 'bot' : 'pending'),
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        ticketId: ticket.id,
        body: body || media?.caption || '',
        fromMe,
        fromBot: false,
        mediaType: media?.type || null,
        externalId,
      },
    });

    // Se a mensagem veio de 'mim' (fromMe), precisamos saber se foi o robô ou o humano no celular
    if (fromMe && ticket.status !== 'open') {
      // Verificamos se essa mensagem já foi gravada como sendo do robô
      const isBotMsg = await prisma.message.findFirst({
        where: { externalId, fromBot: true }
      });

      // Se NÃO for do robô, então foi o humano no celular. Aí sim abrimos o ticket.
      if (!isBotMsg) {
        ticket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: 'open' }
        });
      }
    }

    // --- Lógica de Horário de Atendimento ---
    const isWorking = await businessHourService.isWithinBusinessHours(tenant.id);
    if (!isWorking && !fromMe && tenant.settings?.outOfOfficeMessage) {
       // Se o ticket for novo (criado agora) ou se o status for 'bot', enviamos o aviso
       const lastOooEvent = await prisma.ticketEvent.findFirst({
         where: { ticketId: ticket.id, type: 'ooo_message' },
         orderBy: { createdAt: 'desc' }
       });
       
       // Só envia se não enviou nos últimos 4 horas para evitar spam
       const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
       if (!lastOooEvent || lastOooEvent.createdAt < fourHoursAgo) {
          await evolutionService.sendMessage(
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

    // Download de mídia e Transcrição em background
    if (media) {
      downloadMedia(tenant.settings, instance, msg, message.id).then(async (mediaUrl) => {
        if (!mediaUrl) return;

        let transcription = null;
        const fullPath = path.join(__dirname, '../../', mediaUrl);

        if (media.type === 'audio' && tenant.settings?.geminiKey) {
          try {
            if (fs.existsSync(fullPath)) {
              const audioBase64 = fs.readFileSync(fullPath).toString('base64');
              const mimeType = mediaUrl.endsWith('.mp3') ? 'audio/mp3' : 'audio/ogg';
              transcription = await geminiService.transcribeAudio(tenant.settings.geminiKey, audioBase64, mimeType);
            }
          } catch (err) { console.error('[transcription] erro:', err.message); }
        }

        // --- NOVA LÓGICA DE VISÃO ---
        if (media.type === 'image' && tenant.settings?.geminiKey) {
          try {
            if (fs.existsSync(fullPath)) {
              const imgBase64 = fs.readFileSync(fullPath).toString('base64');
              const mimeType = mediaUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
              console.log('[vision] analisando imagem...');
              transcription = await geminiService.analyzeImage(tenant.settings.geminiKey, imgBase64, mimeType);
              console.log('[vision] resultado:', transcription?.substring(0, 50));
            }
          } catch (err) { console.error('[vision] erro:', err.message); }
        }

        const updated = await prisma.message.update({
          where: { id: message.id },
          data: { 
            mediaUrl,
            transcription
          },
        });
        
        if (io) io.to(tenant.id).emit('message_updated', { ticket, message: updated, contact });

        // Se for BOT e tivemos uma "leitura" da imagem/áudio, responde com debounce
        if (ticket.status === 'bot' && tenant.settings?.botEnabled && transcription) {
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

    if (io) io.to(tenant.id).emit('new_message', { ticket, message, contact });
    
    // Auto-tagueamento (IA) - roda se for a 5ª mensagem para ter contexto
    const msgCount = await prisma.message.count({ where: { ticketId: ticket.id } });
    if (msgCount === 5 && tenant.settings?.geminiKey) {
      handleAutoTagging(tenant, ticket, contact);
    }

    if (ticket.status === 'bot' && tenant.settings?.botEnabled && tenant.settings?.geminiKey && !fromMe) {
      // Lógica de Debounce (Aguardar o cliente terminar de digitar)
      if (pendingReplies[ticket.id]) {
        clearTimeout(pendingReplies[ticket.id]);
      }

      pendingReplies[ticket.id] = setTimeout(async () => {
        try {
          // Se for mídia, espera o processamento dela terminar ou passa o body
          if (!media) {
            await handleBotReply(tenant, waInstance, ticket, contact, body, message);
          } else if (media.type === 'image' || media.type === 'audio') {
            // O processamento de mídia já tem sua própria lógica ou chamará o bot
          }
          delete pendingReplies[ticket.id];
        } catch (err) {
          console.error('[bot-debounce] erro:', err.message);
          delete pendingReplies[ticket.id];
        }
      }, 12000); // 12 segundos de espera
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

  if (userMessage.toLowerCase().includes(transferWord.toLowerCase())) {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'pending' } });
    if (io) io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id, status: 'pending' });
    return;
  }

  // 1. FILTRO DE PALAVRAS-CHAVE (ATALHO RÁPIDO)
  let autoCategory = null;
  const msgLower = userMessage.toLowerCase();
  if (msgLower.includes('boleto') || msgLower.includes('nota') || msgLower.includes('pagamento')) autoCategory = 'FINANCEIRO';
  if (msgLower.includes('toner') || msgLower.includes('tonner') || msgLower.includes('cilindro')) autoCategory = 'SUPRIMENTO';
  if (msgLower.includes('falha') || msgLower.includes('não imprime') || msgLower.includes('parou')) autoCategory = 'SUPORTE';

  // 2. MEMÓRIA DE LONGO PRAZO
  const history = await prisma.message.findMany({
    where: { ticket: { contactId: contact.id }, id: { not: incomingMessage.id } },
    orderBy: { createdAt: 'desc' },
    take: 10, 
  });
  const reversedHistory = [...history].reverse();

  // 3. NOVO SYSTEM PROMPT (OPERACIONAL DE ALTA PERFORMANCE)
  const currentNotes = contact.notes || 'Nenhuma observação cadastrada.';
  const customerName = contact.name || 'Cliente';
  const enhancedSystemPrompt = `Você é um Assistente de Atendimento da LCD DIGITAL.

Sempre use saudações amigáveis e curtas de acordo com o horário (Bom dia, Boa tarde, Boa noite) e SEMPRE chame o cliente pelo nome: ${customerName}.

Sua função NÃO é resolver tudo. Sua função é:
1. ENTENDER rapidamente a solicitação do cliente
2. CLASSIFICAR em: SUPRIMENTO, SUPORTE TÉCNICO, FINANCEIRO ou STATUS.
3. CONDUZIR o atendimento em etapas curtas.
4. RESPONDER de forma CURTA e OBJETIVA.
5. ABRIR o chamado somente após validação mínima.
6. DIRECIONAR para o setor correto.

---
⚡ REGRAS PRINCIPAIS:
- Use saudações personalizadas: "Olá, ${customerName}!", "Bom dia, ${customerName} 👍".
- Clientes falam pouco → NÃO faça muitas perguntas.
- Sempre priorize AGILIDADE sobre explicação.
- Use linguagem simples e direta (estilo WhatsApp).
- Se a informação (como modelo da impressora) já estiver nas [NOTAS DO CLIENTE] abaixo, NÃO PERGUNTE DE NOVO. Apenas confirme se é para aquela mesma máquina.

---
🔁 ORDEM DE ATENDIMENTO (OBRIGATÓRIA):
1. Validar informação mínima (Ex: modelo da impressora).
2. Perguntar: "Precisa de mais alguma coisa?".
3. Abrir chamado (incluir tag [[ROUTE: CATEGORIA]]).
4. Confirmar e Direcionar.

---
🔍 CLASSIFICAÇÃO:
- "toner/cilindro" → [[ROUTE: SUPRIMENTO]]
- "falha/erro/defeito" → [[ROUTE: SUPORTE]]
- "boleto/nota/pagamento" → [[ROUTE: FINANCEIRO]]
- "status/que horas" → [[ROUTE: STATUS]]

---
📸 REGRA SUPORTE: Sempre peça foto/vídeo do problema se for falha técnica.

[NOTAS DO CLIENTE (MEMÓRIA)]:
${currentNotes}

No FINAL da sua resposta, inclua sempre o comando: [[ROUTE: CATEGORIA]]`;

  // Busca semântica de conhecimento
  let knowledgeContext = "";
  let topSimilarity = 0;
  let topContent = null;
  let found = false;

  if (settings.geminiKey) {
    try {
      const userEmbedding = await geminiService.getEmbedding(settings.geminiKey, userMessage);
      if (userEmbedding) {
        const allKnowledges = await prisma.knowledge.findMany({
          where: { tenantId: tenant.id, active: true, embedding: { not: null } }
        });
        
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
          knowledgeContext = "\n\nUSE O SEGUINTE CONHECIMENTO DA EMPRESA (PRIORIZE ISTO):\n" + 
            relevant.map(k => `Dúvida: ${k.question}\nResposta: ${k.answer}`).join("\n---\n");
        }
      }
    } catch (err) { console.error('[bot] erro semântica:', err.message); }
  }

  // Grava log de auditoria da IA
  try {
    await prisma.knowledgeLog.create({
      data: {
        tenantId: tenant.id,
        query: userMessage,
        content: topContent,
        similarity: topSimilarity,
        found
      }
    });
  } catch (err) { console.error('[log] erro ao gravar auditoria:', err.message); }

  const finalPrompt = `${enhancedSystemPrompt}${knowledgeContext}`;
  let botReply = await geminiService.chat(settings.geminiKey, finalPrompt, reversedHistory, userMessage);

  // 4. LÓGICA DE ROTEAMENTO E SALVAMENTO
  const routeMatch = botReply.match(/\[\[ROUTE:\s*(.*?)\]\]/);
  const category = autoCategory || (routeMatch ? routeMatch[1].toUpperCase() : 'SUPORTE');
  
  botReply = botReply.replace(/\[\[ROUTE:.*?\]\]/g, '').trim();

  // Adiciona o nome do Robô na mensagem do WhatsApp
  const botName = settings.botName || 'ROBÔ';
  const finalMessageBody = `*${botName}*\n${botReply}`;

  // Executa o Roteamento
  const teams = await prisma.team.findMany({ where: { tenantId: tenant.id } });
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

  // Atualiza tags do contato
  let currentTags = [];
  try { currentTags = JSON.parse(contact.tags || '[]'); } catch(e) {}
  if (!currentTags.includes(category)) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { tags: JSON.stringify([...currentTags, category]) }
    });
  }

  // Auditoria
  try {
    await prisma.knowledgeLog.create({
      data: {
        tenantId: tenant.id,
        query: userMessage,
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

  if (io) io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id });
}

module.exports = { handleWebhook, setIo };
