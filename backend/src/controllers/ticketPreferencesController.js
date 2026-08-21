const prisma = require('../lib/prisma');

function booleanField(body, key) {
  if (!Object.prototype.hasOwnProperty.call(body, key)) return undefined;
  return body[key];
}

function mergeTicketUserStates(tickets, states) {
  const statesByTicket = new Map(states.map((state) => [state.ticketId, state]));
  return tickets.map((ticket) => {
    const state = statesByTicket.get(ticket.id);
    const userState = state
      ? { isUnread: state.isUnread, isPinned: state.isPinned, pinnedAt: state.pinnedAt }
      : { isUnread: false, isPinned: false, pinnedAt: null };
    return {
      ...ticket,
      isUnread: userState.isUnread,
      isPinned: userState.isPinned,
      pinnedAt: userState.pinnedAt,
      userState,
    };
  }).sort((left, right) => {
    if (left.userState.isPinned !== right.userState.isPinned) return left.userState.isPinned ? -1 : 1;
    if (left.userState.isPinned && right.userState.isPinned) {
      return new Date(right.userState.pinnedAt || 0).getTime() - new Date(left.userState.pinnedAt || 0).getTime();
    }
    return 0;
  });
}

async function updatePreferences(req, res) {
  const ticketId = req.params.id;
  const isUnread = booleanField(req.body || {}, 'isUnread');
  const isPinned = booleanField(req.body || {}, 'isPinned');

  if (isUnread === undefined && isPinned === undefined) {
    return res.status(400).json({ error: 'Informe isUnread ou isPinned.' });
  }
  if (isUnread !== undefined && typeof isUnread !== 'boolean') {
    return res.status(400).json({ error: 'isUnread deve ser booleano.' });
  }
  if (isPinned !== undefined && typeof isPinned !== 'boolean') {
    return res.status(400).json({ error: 'isPinned deve ser booleano.' });
  }

  const key = { userId_ticketId: { userId: req.user.userId, ticketId } };
  const current = await prisma.userTicketState.findUnique({ where: key });
  if (!current && isUnread !== true && isPinned !== true) {
    return res.json({ ticketId, isUnread: false, isPinned: false, pinnedAt: null });
  }

  const createPinned = isPinned === true;
  const createPinnedAt = createPinned ? new Date() : null;
  const update = {
    ...(isUnread !== undefined && { isUnread }),
    ...(isPinned !== undefined && {
      isPinned,
      pinnedAt: isPinned
        ? (current?.isPinned && current.pinnedAt ? current.pinnedAt : new Date())
        : null,
    }),
  };

  const state = await prisma.userTicketState.upsert({
    where: key,
    create: {
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      ticketId,
      isUnread: isUnread === true,
      isPinned: createPinned,
      pinnedAt: createPinnedAt,
    },
    update,
    select: { ticketId: true, isUnread: true, isPinned: true, pinnedAt: true },
  });

  if (!state.isUnread && !state.isPinned) {
    await prisma.userTicketState.delete({ where: key });
    return res.json({ ticketId, isUnread: false, isPinned: false, pinnedAt: null });
  }

  res.json(state);
}

module.exports = { updatePreferences, mergeTicketUserStates };
