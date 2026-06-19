const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

async function list(req, res) {
  // Removido bloqueio estrito de admin para permitir que agentes vejam colegas para transferencia

  const users = await prisma.user.findMany({
    where: { tenantId: req.user.tenantId },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, firebirdSupportName: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

async function create(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { name, email, password, role, firebirdSupportName } = req.body;

  const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
  const count = await prisma.user.count({ where: { tenantId: req.user.tenantId } });

  if (count >= tenant.maxUsers) {
    return res.status(403).json({ error: `Limite de usuarios atingido (${tenant.maxUsers}).` });
  }

  const exists = await prisma.user.findFirst({
    where: { tenantId: req.user.tenantId, email },
  });
  if (exists) return res.status(400).json({ error: 'Email ja cadastrado para esta empresa' });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      tenantId: req.user.tenantId,
      name,
      email,
      password: hash,
      role: role || 'agent',
      firebirdSupportName,
    },
    select: { id: true, name: true, email: true, role: true, active: true, firebirdSupportName: true },
  });
  res.json(user);
}

async function update(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;
  const { name, email, password, role, active, firebirdSupportName } = req.body;

  const data = {
    ...(name && { name }),
    ...(email && { email }),
    ...(role && { role }),
    ...(active !== undefined && { active }),
    ...(firebirdSupportName !== undefined && { firebirdSupportName }),
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const existing = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Usuario nao encontrado' });

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, firebirdSupportName: true },
  });
  res.json(user);
}

async function remove(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;

  if (id === req.user.userId) {
    return res.status(400).json({ error: 'Voce nao pode deletar seu proprio usuario' });
  }

  const existing = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Usuario nao encontrado' });

  const sentInternalCount = await prisma.internalMessage.count({ where: { senderId: id } });
  if (sentInternalCount > 0) {
    return res.status(400).json({
      error: 'Este atendente possui mensagens internas enviadas no historico. Arquive o usuario em vez de excluir.'
    });
  }

  await prisma.$transaction([
    prisma.teamMember.deleteMany({ where: { userId: id } }),
    prisma.message.updateMany({ where: { agentId: id }, data: { agentId: null } }),
    prisma.ticket.updateMany({ where: { agentId: id }, data: { agentId: null, status: 'pending' } }),
    prisma.ticketEvent.updateMany({ where: { userId: id }, data: { userId: null } }),
    prisma.internalMessage.updateMany({ where: { receiverId: id }, data: { receiverId: null } }),
    prisma.serviceOrder.updateMany({ where: { userId: id }, data: { userId: null } }),
    prisma.serviceOrder.updateMany({ where: { closedById: id }, data: { closedById: null } }),
    prisma.user.delete({ where: { id } })
  ]);

  res.sendStatus(204);
}

module.exports = { list, create, update, remove };
