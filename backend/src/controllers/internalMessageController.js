const prisma = require('../lib/prisma');

async function list(req, res) {
  const { tenantId } = req.user;
  const { receiverId } = req.query; // se null, pega mensagens globais/gerais (opcional)

  try {
    const messages = await prisma.internalMessage.findMany({
      where: {
        tenantId,
        OR: [
          { senderId: req.user.userId, receiverId },
          { senderId: receiverId, receiverId: req.user.userId }
        ]
      },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 50
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar mensagens internas' });
  }
}

let io;
function setIo(socketIo) { io = socketIo; }

async function send(req, res) {
  const { tenantId, userId: senderId } = req.user;
  const { receiverId, body } = req.body;

  try {
    const message = await prisma.internalMessage.create({
      data: { tenantId, senderId, receiverId, body },
      include: { sender: { select: { name: true } } }
    });
    
    if (io) {
      io.to(tenantId).emit('new_internal', message);
    }

    res.json(message);
  } catch (err) {
    console.error('[internalChat] erro detalhado:', err);
    res.status(500).json({ error: 'Erro ao enviar mensagem interna: ' + err.message });
  }
}

module.exports = { list, send, setIo };
