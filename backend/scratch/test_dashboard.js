const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const tenantId = (await prisma.tenant.findFirst()).id;
    console.log('Testing for tenantId:', tenantId);

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalTickets,
      openTickets,
      pendingTickets,
      resolvedTickets,
      messagesToday
    ] = await Promise.all([
      prisma.ticket.count({ where: { tenantId } }),
      prisma.ticket.count({ where: { tenantId, status: 'open' } }),
      prisma.ticket.count({ where: { tenantId, status: 'pending' } }),
      prisma.ticket.count({ where: { tenantId, status: 'resolved' } }),
      prisma.message.count({ where: { ticket: { tenantId }, createdAt: { gte: startOfDay } } }),
    ]);

    console.log('Stats:', { totalTickets, openTickets, pendingTickets, resolvedTickets, messagesToday });

    // Top Agents
    const topAgents = await prisma.ticket.groupBy({
      by: ['agentId'],
      where: { tenantId, agentId: { not: null }, status: 'resolved' },
      _count: true,
      orderBy: { _count: { agentId: 'desc' } },
      take: 5
    });
    console.log('Top Agents raw:', JSON.stringify(topAgents));

    const topAgentsWithNames = await Promise.all(topAgents.map(async (a) => {
      const user = await prisma.user.findUnique({ where: { id: a.agentId }, select: { name: true } });
      return { name: user?.name || 'Desconhecido', count: a._count.agentId };
    }));
    console.log('Top Agents with names:', topAgentsWithNames);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
