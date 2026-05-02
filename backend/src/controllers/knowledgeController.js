const prisma = require('../lib/prisma');
const geminiService = require('../services/geminiService');

async function list(req, res) {
  const { tenantId } = req.user;
  const knowledges = await prisma.knowledge.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(knowledges);
}

async function create(req, res) {
  const { tenantId } = req.user;
  const { question, answer, tags } = req.body;

  if (!question || !answer) return res.status(400).json({ error: 'Pergunta e resposta são obrigatórias' });

  let embedding = null;
  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  if (settings?.geminiKey) {
     embedding = await geminiService.getEmbedding(settings.geminiKey, `${question}\n${answer}`);
  }

  const knowledge = await prisma.knowledge.create({
    data: { tenantId, question, answer, tags, embedding }
  });
  res.json(knowledge);
}

async function update(req, res) {
  const { id } = req.params;
  const { question, answer, tags, active } = req.body;

  try {
    let embedding = undefined;
    if (question || answer) {
       const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } });
       if (settings?.geminiKey) {
          const k = await prisma.knowledge.findFirst({ where: { id, tenantId: req.user.tenantId } });
          if (!k) return res.status(404).json({ error: 'Conhecimento nÃ£o encontrado' });
          const q = question || k.question;
          const a = answer || k.answer;
          embedding = await geminiService.getEmbedding(settings.geminiKey, `${q}\n${a}`);
       }
    }

    const existing = await prisma.knowledge.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Conhecimento não encontrado' });

    const updated = await prisma.knowledge.update({
      where: { id },
      data: {
        ...(question && { question }),
        ...(answer && { answer }),
        ...(tags && { tags }),
        ...(active !== undefined && { active }),
        ...(embedding && { embedding })
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(404).json({ error: 'Conhecimento não encontrado' });
  }
}

async function remove(req, res) {
  const { id } = req.params;
  try {
    const existing = await prisma.knowledge.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Conhecimento não encontrado' });

    await prisma.knowledge.delete({ where: { id } });
    res.sendStatus(204);
  } catch (err) {
    res.status(404).json({ error: 'Conhecimento não encontrado' });
  }
}

module.exports = { list, create, update, remove };
