const prisma = require('../lib/prisma');

async function schedule(req, res) {
  const { tenantId } = req.user;
  const { contactId, body, sendAt } = req.body;

  try {
    const scheduled = await prisma.scheduledMessage.create({
      data: {
        tenantId,
        contactId,
        body,
        sendAt: new Date(sendAt)
      }
    });
    res.json(scheduled);
  } catch (err) {
    console.error('[schedule] erro:', err.message);
    res.status(500).json({ error: 'Erro ao agendar mensagem' });
  }
}

async function list(req, res) {
  const { tenantId } = req.user;
  try {
    const scheduled = await prisma.scheduledMessage.findMany({
      where: { tenantId, processed: false },
      include: { contact: true },
      orderBy: { sendAt: 'asc' }
    });
    res.json(scheduled);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
}

async function remove(req, res) {
  const { id } = req.params;
  const { tenantId } = req.user;
  try {
    const scheduled = await prisma.scheduledMessage.findFirst({ where: { id, tenantId } });
    if (!scheduled) return res.status(404).json({ error: 'Agendamento não encontrado' });

    await prisma.scheduledMessage.delete({ where: { id } });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover agendamento' });
  }
}

module.exports = { schedule, list, remove };
