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
  if (m.documentMessage) return { type: 'document', caption: m.documentMessage.caption || '', fileName: m.documentMessage.fileName || 'Documento' };
  if (m.stickerMessage)  return { type: 'image',    caption: '' };
  return null;
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

    let phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (phone.length <= 11 && !phone.startsWith('55')) {
      phone = '55' + phone;
    }

    const media = extractMedia(msg);
    const body = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || media?.caption
      || '';

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo 
                     || msg.message?.imageMessage?.contextInfo
                     || msg.message?.videoMessage?.contextInfo
                     || msg.message?.audioMessage?.contextInfo
                     || msg.message?.documentMessage?.contextInfo;
    
    const quotedMsgId = contextInfo?.stanzaId;
    const quotedMsgBody = contextInfo?.quotedMessage?.conversation 
                       || contextInfo?.quotedMessage?.extendedTextMessage?.text
                       || contextInfo?.quotedMessage?.imageMessage?.caption
                       || contextInfo?.quotedMessage?.videoMessage?.caption
                       || (contextInfo?.quotedMessage?.audioMessage ? '🎤 Áudio' : null)
                       || (contextInfo?.quotedMessage?.documentMessage ? '📎 Documento' : null);

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
          status: fromMe ? 'open' : (tenant.settings?.botEnabled ? 'bot' : 'pending'),
        }
      });
      if (io) io.to(tenant.id).emit('new_ticket', ticket);
    } else if (ticket.status === 'resolved') {
      // Se o ticket já existia mas estava resolvido, REABRE ele para evitar duplicação na lista
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: tenant.settings?.botEnabled ? 'bot' : 'pending', updatedAt: new Date(), unreadCount: { increment: 1 } }
      });
      if (io) io.to(tenant.id).emit('ticket_updated', ticket);
      console.log(`[webhook] Ticket ${ticket.id} reaberto para evitar duplicação.`);
    } else if (!fromMe) {
      // Incrementa unreadCount para mensagens de clientes em tickets já abertos
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { unreadCount: { increment: 1 }, updatedAt: new Date() }
      });
      if (io) io.to(tenant.id).emit('ticket_updated', ticket);
    }

    const message = await prisma.message.create({
      data: {
        ticketId: ticket.id,
        body: body || media?.caption || '',
        fromMe,
        fromBot: false, // Mensagem de webhook nunca é do robô (robô grava via Controller)
        mediaType: media?.type || 'text',
        fileName: media?.fileName || null,
        externalId,
        quotedMsgId,
        quotedMsgBody
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

    // Download de mídia e Transcrição em background
    if (media) {
      downloadMedia(tenant.settings, instance, msg, message.id).then(async (mediaUrl) => {
        if (!mediaUrl) return;

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

        // --- NOVA LÓGICA DE VISÃO ---
        if (media.type === 'image' && tenant.settings?.geminiKey) {
          try {
            if (fs.existsSync(fullPath)) {
              const imgBase64 = (await fs.promises.readFile(fullPath)).toString('base64');
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

    if (io) {
      // Busca o ticket atualizado para garantir que o status e dados batam com o banco
      const freshTicket = await prisma.ticket.findUnique({ 
        where: { id: ticket.id },
        include: { contact: true, agent: { select: { name: true } } }
      });
      console.log(`[socket] emitindo new_message para tenant ${tenant.id} | Ticket: ${freshTicket.id} | Status: ${freshTicket.status}`);
      io.to(tenant.id).emit('new_message', { ticket: freshTicket, message, contact });
    } else {
      console.warn('[socket] aviso: objeto io não inicializado no webhookController');
    }
    
    // Auto-tagueamento (IA) - DESATIVADO conforme solicitação do usuário
    // const msgCount = await prisma.message.count({ where: { ticketId: ticket.id } });
    // if (msgCount === 5 && tenant.settings?.geminiKey) {
    //   handleAutoTagging(tenant, ticket, contact);
    // }

    if (ticket.status === 'bot' && tenant.settings?.botEnabled && tenant.settings?.geminiKey && !fromMe) {
      console.log(`[bot] Iniciando debounce para ticket ${ticket.id} (12s)...`);
      if (pendingReplies[ticket.id]) {
        clearTimeout(pendingReplies[ticket.id]);
      }

      pendingReplies[ticket.id] = setTimeout(async () => {
        try {
          console.log(`[bot] Executando resposta para ticket ${ticket.id}`);
          // 4. LÓGICA DO ROBÔ (IA) - Se for mídia, o robô responde via debounce após o download/transcrição
          if (ticket.status === 'bot' && tenant.settings?.botEnabled && !fromMe && !media) {
            await handleBotReply(tenant, waInstance, ticket, contact, body, message);
          } else if (media.type === 'image' || media.type === 'audio') {
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

  const reversedHistory = [...cleanHistory].reverse();

  // 3. SYSTEM PROMPT (Prioridade absoluta para o que o usuário escreveu no painel)
  const userPrompt = settings.botSystemPrompt || 'Você é um Assistente de Atendimento cordial.';

  // 4. CONTEXTO TÉCNICO (Equipamentos e Notas)
  const equipments = await prisma.equipment.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      OR: [
        { contactId: contact.id },
        { contact: { phone: contact.phone } },
        { contact: { whatsapp: contact.phone } }
      ]
    }
  });

  const equipContext = equipments.length > 0 
    ? equipments.map(e => `- ${e.manufacturer || ''} ${e.model} (Série: ${e.serialNumber || 'N/A'}, Setor: ${e.sector || 'N/A'})`).join('\n')
    : 'Nenhum equipamento cadastrado para este cliente.';

  const technicalInstructions = `
---
[INSTRUÇÕES DE FLUXO DE SISTEMA - PRIORITÁRIO]:
1. Você é o Assistente Virtual da LCD DIGITAL.
2. Ao receber pedidos de TONER ou SUPORTE:
   - Verifique a lista [EQUIPAMENTOS DO CLIENTE] abaixo.
   - Se houver equipamentos na lista: Você DEVE listar o modelo de cada um e perguntar: "Para qual destas máquinas você precisa de [solicitação]?". NUNCA peça o modelo se ele já estiver na lista.
   - Se a lista estiver vazia: Pergunte educadamente qual o modelo da máquina.
3. [VALIDAÇÃO DE COR]: Se a máquina for COLORIDA (verifique no campo "Tipo" ou pelo conhecimento do modelo, ex: Xerox 7845, Ricoh C3003), você DEVE perguntar quais cores de toner o cliente precisa (Ciano, Magenta, Amarelo ou Preto).
4. [CONFIRMAÇÃO]: NUNCA diga "Já abri o chamado". Use sempre frases como "Entendido! Iremos abrir um chamado para você e nosso time técnico seguirá com o atendimento." ou "Perfeito, vou encaminhar sua solicitação para a abertura do chamado."
5. SEMPRE identifique a CATEGORIA (SUPRIMENTO, SUPORTE, FINANCEIRO ou STATUS).
6. SEMPRE adicione no final da resposta: [[ROUTE: CATEGORIA]]
7. Seja curto, direto e use o estilo de conversa do WhatsApp.`;

  console.log(`[bot] Ticket ${ticket.id} | Equipamentos encontrados: ${equipments.length}`);
  if (equipments.length > 0) console.log(`[bot] Contexto de equipamentos enviado:\n${equipContext}`);

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

  let botReply = await geminiService.chat(settings.geminiKey, finalPrompt, reversedHistory, userMessage);

  // EXTRAÇÃO DE MEMÓRIA DE LONGO PRAZO (Background Task)
  const extractionHistory = [...reversedHistory, { fromMe: false, body: userMessage }];
  geminiService.extractClientInfo(settings.geminiKey, extractionHistory, contact.notes)
    .then(async (newNotes) => {
      if (newNotes) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { notes: newNotes }
        });
        if (io) io.to(tenant.id).emit('contact_updated', { contactId: contact.id });
      }
    })
    .catch(err => console.error('[webhook] erro na extração de memória:', err.message));

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

module.exports = { handleWebhook, setIo };
