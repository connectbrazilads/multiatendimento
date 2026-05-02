const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tickets = await prisma.ticket.findMany({
    where: { status: { in: ['pending', 'open', 'bot'] } },
    include: { contact: true, agent: true, team: true },
    orderBy: { updatedAt: 'desc' },
    take: 10
  });

  console.log('--- ÚLTIMOS TICKETS ATUALIZADOS ---');
  tickets.forEach(t => {
    console.log(`ID: ${t.id} | Status: ${t.status} | Agent: ${t.agent?.name || 'Ninguém'} | Team: ${t.team?.name || 'Nenhuma'} | Contato: ${t.contact.name}`);
  });

  process.exit(0);
}

check();
