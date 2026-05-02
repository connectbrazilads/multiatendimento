const prisma = require('../lib/prisma');

async function list(req, res) {
  const { q } = req.query;
  const where = { tenantId: req.user.tenantId };
  if (q) where.OR = [
    { name: { contains: q, mode: 'insensitive' } },
    { phone: { contains: q } },
  ];

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      tickets: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { id: true, status: true, updatedAt: true },
      },
    },
  });
  res.json(contacts);
}

async function getHistory(req, res) {
  const { id } = req.params;
  const contact = await prisma.contact.findFirst({
    where: { id, tenantId: req.user.tenantId },
  });
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

  const tickets = await prisma.ticket.findMany({
    where: { contactId: id, tenantId: req.user.tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      agent: { select: { id: true, name: true } },
    },
  });
  res.json({ contact, tickets });
}

async function updateContact(req, res) {
  const { id } = req.params;
  const { notes, tags, name } = req.body;
  const contact = await prisma.contact.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      ...(notes !== undefined && { notes }),
      ...(tags !== undefined && { tags: JSON.stringify(tags) }),
      ...(name !== undefined && { name }),
    },
  });
  res.json(updated);
}

async function getMedia(req, res) {
  const { id } = req.params;
  const contact = await prisma.contact.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

  const messages = await prisma.message.findMany({
    where: {
      ticket: { contactId: id, tenantId: req.user.tenantId },
      mediaUrl: { not: null },
      mediaType: { in: ['image', 'document', 'audio'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, mediaUrl: true, mediaType: true, body: true, createdAt: true },
  });
  res.json(messages);
}

async function create(req, res) {
  const { name, phone, instanceId } = req.body;
  const { tenantId } = req.user;

  const exists = await prisma.contact.findFirst({ where: { tenantId, phone } });
  if (exists) return res.status(400).json({ error: 'Telefone já cadastrado' });

  let finalInstanceId = instanceId;
  if (!finalInstanceId) {
    const inst = await prisma.waInstance.findFirst({ where: { tenantId, status: 'CONNECTED' } });
    if (!inst) return res.status(400).json({ error: 'Nenhuma conexão WhatsApp ativa encontrada' });
    finalInstanceId = inst.id;
  }

  const contact = await prisma.contact.create({
    data: { name, phone, tenantId, instanceId: finalInstanceId }
  });
  res.json(contact);
}

async function getTags(req, res) {
  const { tenantId } = req.user;
  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    select: { tags: true }
  });

  const allTags = new Set();
  contacts.forEach(c => {
    try {
      const tags = JSON.parse(c.tags || '[]');
      tags.forEach(t => allTags.add(t));
    } catch {}
  });

  res.json(Array.from(allTags));
}

module.exports = { list, getHistory, updateContact, getMedia, create, getTags };
