const prisma = require('../lib/prisma');

async function getStats(req, res) {
  const tenantId = req.user.tenantId;

  // 1. Mensagens por Origem (IA vs Humano) nos últimos 30 dias
  const messages = await prisma.message.groupBy({
    by: ['fromBot', 'fromMe'],
    where: {
      ticket: { tenantId },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    _count: { id: true }
  });

  let iaMessages = 0;
  let humanMessages = 0;

  messages.forEach(m => {
    if (m.fromBot) iaMessages += m._count.id;
    else if (m.fromMe) humanMessages += m._count.id;
  });

  // 2. Status dos Tickets
  const tickets = await prisma.ticket.groupBy({
    by: ['status'],
    where: { tenantId },
    _count: { id: true }
  });

  // 3. Taxa de Retenção IA (Tickets resolvidos sem agente humano)
  const resolvedByIA = await prisma.ticket.count({
    where: {
      tenantId,
      status: 'resolved',
      agentId: null
    }
  });

  const totalResolved = await prisma.ticket.count({
    where: {
      tenantId,
      status: 'resolved'
    }
  });

  // 4. Contatos Totais
  const totalContacts = await prisma.contact.count({
    where: { tenantId }
  });

  // Cálculo de Tempo Economizado (Estimativa: 2 minutos por mensagem da IA)
  const minutesSaved = iaMessages * 2;
  const hoursSaved = Math.round(minutesSaved / 60);

  // 5. TMA (Tempo Médio de Atendimento) - Tickets resolvidos nos últimos 30 dias
  const resolvedTickets = await prisma.ticket.findMany({
    where: {
      tenantId,
      status: 'resolved',
      resolvedAt: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    select: { createdAt: true, resolvedAt: true }
  });

  let totalTMA = 0;
  resolvedTickets.forEach(t => {
    const diff = t.resolvedAt.getTime() - t.createdAt.getTime();
    totalTMA += diff;
  });

  const avgTMA = resolvedTickets.length > 0 ? Math.round((totalTMA / resolvedTickets.length) / 60000) : 0; // em minutos

  // 6. Ranking de Atendentes (Top 5 por tickets resolvidos)
  const agentRanking = await prisma.ticket.groupBy({
    by: ['agentId'],
    where: {
      tenantId,
      status: 'resolved',
      agentId: { not: null }
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });

  // Buscar nomes dos agentes
  const agentIds = agentRanking.map(a => a.agentId);
  const agents = await prisma.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true }
  });

  const formattedRanking = agentRanking.map(a => ({
    name: agents.find(u => u.id === a.agentId)?.name || 'Ex-Agente',
    count: a._count.id
  }));

  // 7. Média de CSAT (Avaliações)
  const ratings = await prisma.ticket.aggregate({
    where: { tenantId, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true }
  });

  // 8. Mensagens por Dia (Últimos 7 dias)
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dailyMessages = await prisma.$queryRaw`
    SELECT 
      DATE("createdAt") as date,
      COUNT(CASE WHEN "fromBot" = true THEN 1 END)::int as ia,
      COUNT(CASE WHEN "fromMe" = true AND "fromBot" = false THEN 1 END)::int as human
    FROM "Message"
    WHERE "createdAt" >= ${last7Days}
    AND "ticketId" IN (SELECT id FROM "Ticket" WHERE "tenantId" = ${tenantId})
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt") ASC
  `;

  // 9. Distribuição de Avaliações (CSAT)
  const ratingsDist = await prisma.ticket.groupBy({
    by: ['rating'],
    where: { tenantId, rating: { not: null } },
    _count: { id: true }
  });

  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingsDist.forEach(r => { dist[r.rating] = r._count.id; });

  res.json({
    kpis: {
      iaMessages,
      humanMessages,
      hoursSaved,
      avgTMA,
      retentionRate: totalResolved > 0 ? Math.round((resolvedByIA / totalResolved) * 100) : 0,
      totalContacts,
      activeTickets: tickets.find(t => t.status === 'open')?._count.id || 0,
      pendingTickets: tickets.find(t => t.status === 'pending')?._count.id || 0,
      avgRating: Math.round((ratings._avg.rating || 0) * 10) / 10,
      totalRatings: ratings._count.rating
    },
    ticketsByStatus: tickets,
    agentRanking: formattedRanking,
    dailyMessages: Array.isArray(dailyMessages) ? dailyMessages.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      ia: d.ia,
      human: d.human
    })) : [],
    ratingsDistribution: Object.keys(dist).map(k => ({ rating: k, count: dist[k] }))
  });
}

module.exports = { getStats };
