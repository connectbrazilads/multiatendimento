const prisma = require('../lib/prisma');

/**
 * Serviço centralizado para auditoria de eventos de tickets.
 * Tipos de eventos: assigned, transferred, resolved, reopened, priority_changed, tag_added, etc.
 */
async function logEvent({ ticketId, tenantId, userId, type, payload }) {
  try {
    const event = await prisma.ticketEvent.create({
      data: {
        ticketId,
        tenantId,
        userId,
        type,
        payload: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null
      }
    });
    return event;
  } catch (err) {
    console.error('[historyService] erro ao registrar evento:', err.message);
    // Não trava o fluxo principal se a auditoria falhar
  }
}

module.exports = { logEvent };
