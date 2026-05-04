const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Iniciando faxina completa...');
  
  try {
    // Apaga equipamentos primeiro (devido às chaves estrangeiras)
    const equipments = await prisma.equipment.deleteMany({});
    console.log(`✅ ${equipments.count} equipamentos removidos.`);

    // 1. Apaga eventos de tickets (a base de tudo)
    const events = await prisma.ticketEvent.deleteMany({});
    console.log(`✅ ${events.count} eventos de tickets removidos.`);

    // 2. Apaga mensagens
    const messages = await prisma.message.deleteMany({});
    console.log(`✅ ${messages.count} mensagens removidas.`);

    // 3. Apaga tickets
    const tickets = await prisma.ticket.deleteMany({});
    console.log(`✅ ${tickets.count} conversas (tickets) removidas.`);

    // Apaga ordens de serviço
    const sos = await prisma.serviceOrder.deleteMany({});
    console.log(`✅ ${sos.count} ordens de serviço removidas.`);

    // Apaga contatos
    const contacts = await prisma.contact.deleteMany({});
    console.log(`✅ ${contacts.count} contatos removidos.`);

    console.log('✨ Faxina concluída com sucesso! Base limpa para importação.');
  } catch (error) {
    console.error('❌ Erro na faxina:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
