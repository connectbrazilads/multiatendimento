const prisma = require('../lib/prisma');

const ALLOWED_PERIOD_DAYS = [7, 30, 90];

function resolvePeriodDays(raw) {
  const parsed = parseInt(raw, 10);
  return ALLOWED_PERIOD_DAYS.includes(parsed) ? parsed : 30;
}

async function getStats(req, res) {
  const tenantId = req.user.tenantId;
  const periodDays = resolvePeriodDays(req.query.days);
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // 1. Mensagens por Origem (IA vs Humano) no período selecionado
  const messages = await prisma.message.groupBy({
    by: ['fromBot', 'fromMe'],
    where: {
      ticket: { tenantId },
      createdAt: { gte: periodStart }
    },
    _count: { id: true }
  });

  let iaMessages = 0;
  let humanMessages = 0;
  messages.forEach(m => {
    if (m.fromBot) iaMessages += m._count.id;
    else if (m.fromMe) humanMessages += m._count.id;
  });

  // 1b. Totais histéricos (desde sempre), independente do período selecionado -
  // é o "quantas mensagens a IA já processou até hoje" que fica sempre visível.
  const messagesAllTime = await prisma.message.groupBy({
    by: ['fromBot', 'fromMe'],
    where: { ticket: { tenantId } },
    _count: { id: true }
  });
  let iaMessagesAllTime = 0;
  let humanMessagesAllTime = 0;
  messagesAllTime.forEach(m => {
    if (m.fromBot) iaMessagesAllTime += m._count.id;
    else if (m.fromMe) humanMessagesAllTime += m._count.id;
  });

  // 2. Status dos Tickets (estado atual da operação - não depende do período)
  const tickets = await prisma.ticket.groupBy({
    by: ['status'],
    where: { tenantId },
    _count: { id: true }
  });

  // 3. Taxa de Retenção IA (tickets resolvidos sem agente humano) no período
  const resolvedByIA = await prisma.ticket.count({
    where: { tenantId, status: 'resolved', agentId: null, resolvedAt: { gte: periodStart } }
  });
  const totalResolved = await prisma.ticket.count({
    where: { tenantId, status: 'resolved', resolvedAt: { gte: periodStart } }
  });

  // 4. Contatos: total histórico e novos no período (indicador de crescimento)
  const totalContacts = await prisma.contact.count({ where: { tenantId } });
  const newContacts = await prisma.contact.count({ where: { tenantId, createdAt: { gte: periodStart } } });

  // Cálculo de Tempo Economizado (Estimativa: 2 minutos por mensagem da IA) no período
  const minutesSaved = iaMessages * 2;
  const hoursSaved = Math.round(minutesSaved / 60);

  // 5. TMA (Tempo Médio de Atendimento) - Tickets resolvidos no período selecionado
  const resolvedTickets = await prisma.ticket.findMany({
    where: { tenantId, status: 'resolved', resolvedAt: { gte: periodStart } },
    select: { createdAt: true, resolvedAt: true }
  });
  let totalTMA = 0;
  resolvedTickets.forEach(t => { totalTMA += t.resolvedAt.getTime() - t.createdAt.getTime(); });
  const avgTMA = resolvedTickets.length > 0 ? Math.round((totalTMA / resolvedTickets.length) / 60000) : 0; // em minutos

  // 6. Detalhamento por atendente (não só o Top 5): tickets resolvidos, mensagens
  // enviadas, TMA médio e CSAT médio de cada um, todos já recortados pelo período.
  const activeAgents = await prisma.user.findMany({
    where: { tenantId, active: true },
    select: { id: true, name: true }
  });
  const agentBreakdown = (await Promise.all(activeAgents.map(async (agent) => {
    const [resolvedCount, messagesCount, csatAgg, resolvedForTma] = await Promise.all([
      prisma.ticket.count({ where: { tenantId, agentId: agent.id, status: 'resolved', resolvedAt: { gte: periodStart } } }),
      prisma.message.count({ where: { agentId: agent.id, fromMe: true, fromBot: false, createdAt: { gte: periodStart } } }),
      prisma.ticket.aggregate({
        where: { tenantId, agentId: agent.id, rating: { not: null }, ratingAt: { gte: periodStart } },
        _avg: { rating: true },
        _count: { rating: true }
      }),
      prisma.ticket.findMany({
        where: { tenantId, agentId: agent.id, status: 'resolved', resolvedAt: { gte: periodStart } },
        select: { createdAt: true, resolvedAt: true }
      }),
    ]);
    let avgTmaAgent = 0;
    if (resolvedForTma.length) {
      const totalMs = resolvedForTma.reduce((sum, t) => sum + (t.resolvedAt.getTime() - t.createdAt.getTime()), 0);
      avgTmaAgent = Math.round((totalMs / resolvedForTma.length) / 60000);
    }
    return {
      id: agent.id,
      name: agent.name,
      resolvedCount,
      messagesCount,
      avgTma: avgTmaAgent,
      avgCsat: csatAgg._avg.rating != null ? Math.round(csatAgg._avg.rating * 10) / 10 : null,
      csatCount: csatAgg._count.rating,
    };
  }))).filter((agent) => agent.resolvedCount > 0 || agent.messagesCount > 0)
    .sort((a, b) => b.resolvedCount - a.resolvedCount);

  // 7. Média de CSAT (Avaliações) no período
  const ratings = await prisma.ticket.aggregate({
    where: { tenantId, rating: { not: null }, ratingAt: { gte: periodStart } },
    _avg: { rating: true },
    _count: { rating: true }
  });

  // 8. Mensagens por Dia, cobrindo o período selecionado (7/30/90 dias)
  const dailyMessages = await prisma.$queryRaw`
    SELECT
      DATE("createdAt") as date,
      COUNT(CASE WHEN "fromBot" = true THEN 1 END)::int as ia,
      COUNT(CASE WHEN "fromMe" = true AND "fromBot" = false THEN 1 END)::int as human
    FROM "Message"
    WHERE "createdAt" >= ${periodStart}
    AND "ticketId" IN (SELECT id FROM "Ticket" WHERE "tenantId" = ${tenantId})
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt") ASC
  `;

  // 9. Distribuição de Avaliações (CSAT) no período
  const ratingsDist = await prisma.ticket.groupBy({
    by: ['rating'],
    where: { tenantId, rating: { not: null }, ratingAt: { gte: periodStart } },
    _count: { id: true }
  });
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingsDist.forEach(r => { dist[r.rating] = r._count.id; });

  res.json({
    periodDays,
    kpis: {
      iaMessages,
      humanMessages,
      totalMessages: iaMessages + humanMessages,
      iaMessagesAllTime,
      humanMessagesAllTime,
      totalMessagesAllTime: iaMessagesAllTime + humanMessagesAllTime,
      hoursSaved,
      avgTMA,
      retentionRate: totalResolved > 0 ? Math.round((resolvedByIA / totalResolved) * 100) : 0,
      totalContacts,
      newContacts,
      activeTickets: tickets.find(t => t.status === 'open')?._count.id || 0,
      pendingTickets: tickets.find(t => t.status === 'pending')?._count.id || 0,
      avgRating: Math.round((ratings._avg.rating || 0) * 10) / 10,
      totalRatings: ratings._count.rating
    },
    ticketsByStatus: tickets,
    agentRanking: agentBreakdown.slice(0, 5).map((a) => ({ name: a.name, count: a.resolvedCount })),
    agentBreakdown,
    dailyMessages: Array.isArray(dailyMessages) ? dailyMessages.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      ia: d.ia,
      human: d.human
    })) : [],
    ratingsDistribution: Object.keys(dist).map(k => ({ rating: k, count: dist[k] }))
  });
}

module.exports = { getStats };
