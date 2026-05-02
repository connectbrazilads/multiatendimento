const prisma = require('../lib/prisma');
const { parse } = require('json2csv');

async function exportTickets(req, res) {
  const { tenantId } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const where = { tenantId };
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        contact: true,
        agent: { select: { name: true } },
        team: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = tickets.map(t => ({
      ID: t.id,
      Data: t.createdAt.toISOString().split('T')[0],
      Hora: t.createdAt.toISOString().split('T')[1].split('.')[0],
      Cliente: t.contact.name || t.contact.phone,
      Telefone: t.contact.phone,
      Status: t.status,
      Agente: t.agent?.name || 'N/A',
      Equipe: t.team?.name || 'N/A',
      Resolvido_Em: t.resolvedAt ? t.resolvedAt.toISOString() : ''
    }));

    const csv = parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`relatorio_atendimentos_${new Date().getTime()}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error('[report] erro:', err.message);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
}

module.exports = { exportTickets };
