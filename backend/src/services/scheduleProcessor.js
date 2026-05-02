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

// Roda a cada 1 minuto
function start() {
  setInterval(processScheduledMessages, 60000);
  console.log('[schedule] processador iniciado (1 min)');
}

module.exports = { start };
