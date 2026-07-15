const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const prisma = require('./src/lib/prisma');
const evolutionService = require('./src/services/evolutionService');
const axios = require('axios');

async function main() {
  const instances = await prisma.waInstance.findMany({
    include: { tenant: { include: { settings: true } } }
  });

  for (const instance of instances) {
    if (!instance.tenant || !instance.tenant.settings) continue;
    const settings = instance.tenant.settings;
    if (!settings.evolutionUrl || !settings.evolutionKey) continue;

    console.log(`\nVerificando instancia: ${instance.instanceName}`);

    try {
      const chatsResponse = await evolutionService.findChats(settings.evolutionUrl, settings.evolutionKey, instance.instanceName);
      let chats = Array.isArray(chatsResponse) ? chatsResponse : (chatsResponse?.data || chatsResponse?.chats || []);

      console.log(`Encontrados ${chats.length} chats para ${instance.instanceName}`);

      let totalSynced = 0;

      for (const chat of chats) {
        const jid = chat.id || chat.remoteJid;
        if (!jid) continue;

        const messagesResponse = await evolutionService.findMessages(settings.evolutionUrl, settings.evolutionKey, instance.instanceName, jid, 20);
        let messages = Array.isArray(messagesResponse) ? messagesResponse : (messagesResponse?.data || messagesResponse?.messages || []);

        // As mensagens vÃªm da API da Evolution
        for (const msg of messages) {
          const externalId = msg.key?.id || msg.id;
          if (!externalId) continue;

          const msgTimestamp = msg.messageTimestamp || msg.timestamp || (msg.key?.messageTimestamp);
          const timeSec = msgTimestamp ? parseInt(msgTimestamp) : 0;
          if (timeSec === 0) continue;

          const ageHours = (Date.now() - (timeSec * 1000)) / (1000 * 60 * 60);

          // Somente mensagens das Ãºltimas 12 horas
          if (ageHours > 12) continue;

          // Verifica se jÃ¡ existe no banco
          const exists = await prisma.message.findFirst({ where: { externalId } });

          if (!exists) {
            console.log(`- Mensagem NÃƒO ENCONTRADA no banco: ${externalId} (Idade: ${ageHours.toFixed(1)}h) - Sincronizando...`);

            // Disparar via webhook local para simular recebimento
            try {
              await axios.post(`http://127.0.0.1:3003/api/webhook`, {
                event: 'messages.upsert',
                instance: instance.instanceName,
                data: {
                  messages: [msg]
                }
              });
              totalSynced++;
              await new Promise(resolve => setTimeout(resolve, 500)); // Sleep para nÃ£o sobrecarregar
            } catch (err) {
              console.error(`  Erro ao disparar webhook para msg ${externalId}:`, err.message);
            }
          }
        }
      }

      console.log(`SincronizaÃ§Ã£o concluÃ­da para ${instance.instanceName}. ${totalSynced} mensagens recuperadas.`);

    } catch (err) {
      console.error(`Erro ao processar instancia ${instance.instanceName}:`, err.response?.data || err.message);
    }
  }

  console.log('\nFinalizado!');
  process.exit(0);
}

main().catch(console.error);
