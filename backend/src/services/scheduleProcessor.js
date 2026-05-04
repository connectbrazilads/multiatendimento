const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const evolutionService = require('./evolutionService');

async function processScheduledMessages() {
  const now = new Date();
  
  try {
    const messages = await prisma.scheduledMessage.findMany({
      where: {
        processed: false,
        sendAt: { lte: now }
      },
      include: {
        tenant: { include: { settings: true, instances: true } },
        contact: true
      }
    });

    if (messages.length === 0) return;

    console.log(`[schedule] processando ${messages.length} mensagens agendadas...`);

    for (const msg of messages) {
      try {
        const settings = msg.tenant.settings;
        const instance = msg.tenant.instances[0]; // Pega a primeira instância ativa

        if (settings && instance && settings.evolutionUrl && settings.evolutionKey) {
          await evolutionService.sendText(
            settings.evolutionUrl,
            settings.evolutionKey,
            instance.instanceName,
            msg.contact.phone,
            msg.body
          );

          // Cria a mensagem no histórico do ticket
          const ticket = await prisma.ticket.findFirst({
            where: { contactId: msg.contactId, status: { in: ['pending', 'open', 'bot'] } }
          });

          if (ticket) {
            await prisma.message.create({
              data: {
                ticketId: ticket.id,
                body: msg.body,
                fromMe: true,
                fromBot: false
              }
            });
          }

          await prisma.scheduledMessage.update({
            where: { id: msg.id },
            data: { processed: true }
          });
        }
      } catch (err) {
        console.error(`[schedule] erro ao processar mensagem ${msg.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[schedule] erro geral:', err.message);
  }
}

// Limpeza de Mídias (Fotos, Vídeos, Áudios) com mais de 7 dias
async function nightlyCleanup() {
  console.log('[cleanup] Iniciando limpeza noturna (03:00)...');
  const mediaDir = path.join(__dirname, '../../uploads/media');
  
  try {
    if (fs.existsSync(mediaDir)) {
      const files = fs.readdirSync(mediaDir);
      const now = Date.now();
      const expiry = 7 * 24 * 60 * 60 * 1000; // 7 dias
      
      let count = 0;
      files.forEach(file => {
        const filePath = path.join(mediaDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > expiry) {
          fs.unlinkSync(filePath);
          count++;
        }
      });
      console.log(`[cleanup] ${count} arquivos de mídia antigos removidos.`);
    }
  } catch (err) {
    console.error('[cleanup] erro na limpeza:', err.message);
  }
}

// Roda o processador de mensagens a cada 1 minuto e a limpeza às 03:00
function start() {
  // Processador de Agendamentos
  setInterval(processScheduledMessages, 60000);
  console.log('[schedule] processador de mensagens iniciado (1 min)');

  // Limpeza Noturna (03:00 AM)
  cron.schedule('0 3 * * *', () => {
    nightlyCleanup();
  });
  console.log('[cleanup] Cron de limpeza noturna agendado (03:00)');
}

module.exports = { start };
