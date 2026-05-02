const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

async function list(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  const users = await prisma.user.findMany({
    where: { tenantId: req.user.tenantId },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

async function create(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { name, email, password, role } = req.body;

  const exists = await prisma.user.findFirst({
    where: { tenantId: req.user.tenantId, email },
  });
  if (exists) return res.status(400).json({ error: 'Email já cadastrado para esta empresa' });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      tenantId: req.user.tenantId,
      name,
      email,
      password: hash,
      role: role || 'agent',
    },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  res.json(user);
}

async function update(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;
  const { name, email, password, role, active } = req.body;

  const data = {
    ...(name && { name }),
    ...(email && { email }),
    ...(role && { role }),
    ...(active !== undefined && { active }),
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const existing = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' });

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  res.json(user);
}

async function remove(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;

  // Evita deletar a si mesmo
  if (id === req.user.userId) return res.status(400).json({ error: 'Você não pode deletar seu próprio usuário' });

  const existing = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' });

  await prisma.user.delete({ where: { id } });
  res.sendStatus(204);
}

module.exports = { list, create, update, remove };
