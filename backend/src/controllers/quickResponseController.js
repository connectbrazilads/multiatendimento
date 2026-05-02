const prisma = require('../lib/prisma');

async function listQuickResponses(req, res) {
  const responses = await prisma.quickResponse.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { shortcut: 'asc' },
  });
  res.json(responses);
}

async function createQuickResponse(req, res) {
  const { shortcut, message } = req.body;
  if (!shortcut || !message) return res.status(400).json({ error: 'Atalho e mensagem são obrigatórios' });

  try {
    const response = await prisma.quickResponse.create({
      data: {
        tenantId: req.user.tenantId,
        shortcut: shortcut.startsWith('/') ? shortcut : `/${shortcut}`,
        message,
      },
    });
    res.json(response);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Atalho já existe' });
    res.status(500).json({ error: 'Erro ao criar resposta rápida' });
  }
}

async function deleteQuickResponse(req, res) {
  const { id } = req.params;
  await prisma.quickResponse.deleteMany({
    where: { id, tenantId: req.user.tenantId },
  });
  res.sendStatus(204);
}

module.exports = { listQuickResponses, createQuickResponse, deleteQuickResponse };
