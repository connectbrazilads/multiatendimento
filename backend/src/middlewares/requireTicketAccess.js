const prisma = require('../lib/prisma');
const { hasPermission } = require('../auth/permissions');

module.exports = async (req, res, next) => {
  if (hasPermission(req.user, 'inbox.view_all')) return next();
  const ticketId = req.params.id;
  if (!ticketId) return next();

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, tenantId: req.user.tenantId },
    select: { id: true, agentId: true, teamId: true },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket nao encontrado' });
  if (!ticket.agentId || ticket.agentId === req.user.userId) return next();

  if (ticket.teamId) {
    const membership = await prisma.teamMember.findFirst({
      where: { userId: req.user.userId, teamId: ticket.teamId },
      select: { id: true },
    });
    if (membership) return next();
  }

  return res.status(403).json({ error: 'Este atendimento nao pertence ao usuario ou a sua equipe.' });
};
