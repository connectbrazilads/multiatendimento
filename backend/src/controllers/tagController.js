const prisma = require('../lib/prisma');

async function list(req, res) {
  const tags = await prisma.tag.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { name: 'asc' }
  });
  res.json(tags);
}

async function create(req, res) {
  const { name, color } = req.body;
  const tag = await prisma.tag.create({
    data: { name, color, tenantId: req.user.tenantId }
  });
  res.json(tag);
}

async function update(req, res) {
  const { id } = req.params;
  const { name, color } = req.body;
  
  const exists = await prisma.tag.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!exists) return res.status(404).json({ error: 'Tag não encontrada' });

  const tag = await prisma.tag.update({
    where: { id },
    data: { name, color }
  });
  res.json(tag);
}

async function remove(req, res) {
  const { id } = req.params;
  
  const exists = await prisma.tag.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!exists) return res.status(404).json({ error: 'Tag não encontrada' });

  await prisma.tag.delete({ where: { id } });
  res.json({ message: 'Tag removida' });
}

module.exports = { list, create, update, remove };
