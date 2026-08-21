const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/lib/prisma');
const {
  updatePreferences,
  mergeTicketUserStates,
} = require('../src/controllers/ticketPreferencesController');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request(body = {}) {
  return {
    params: { id: 'ticket-1' },
    body,
    user: { userId: 'user-1', tenantId: 'tenant-1' },
  };
}

test('GET /tickets recebe estado padrao e coloca fixados primeiro', () => {
  const tickets = [{ id: 'normal' }, { id: 'pinned-old' }, { id: 'pinned-new' }];
  const states = [
    { ticketId: 'pinned-old', isUnread: false, isPinned: true, pinnedAt: new Date('2026-08-20T10:00:00Z') },
    { ticketId: 'pinned-new', isUnread: true, isPinned: true, pinnedAt: new Date('2026-08-21T10:00:00Z') },
  ];
  const result = mergeTicketUserStates(tickets, states);
  assert.deepEqual(result.map((ticket) => ticket.id), ['pinned-new', 'pinned-old', 'normal']);
  assert.deepEqual(result[2].userState, { isUnread: false, isPinned: false, pinnedAt: null });
  assert.equal(result[0].userState.isUnread, true);
  assert.equal(result[0].isUnread, true);
  assert.equal(result[0].isPinned, true);
  assert.equal(result[2].isPinned, false);
  assert.equal(result[2].pinnedAt, null);
});

test('cria preferencia individual sem alterar unreadCount do ticket', { concurrency: false }, async () => {
  const previousFind = prisma.userTicketState.findUnique;
  const previousUpsert = prisma.userTicketState.upsert;
  let upsertArgs;
  prisma.userTicketState.findUnique = async () => null;
  prisma.userTicketState.upsert = async (args) => {
    upsertArgs = args;
    return { ticketId: 'ticket-1', isUnread: true, isPinned: true, pinnedAt: args.create.pinnedAt };
  };
  try {
    const res = responseRecorder();
    await updatePreferences(request({ isUnread: true, isPinned: true }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(upsertArgs.create.tenantId, 'tenant-1');
    assert.equal(upsertArgs.create.userId, 'user-1');
    assert.equal(upsertArgs.create.ticketId, 'ticket-1');
    assert.equal(Object.hasOwn(upsertArgs.create, 'unreadCount'), false);
    assert.equal(res.body.isUnread, true);
    assert.equal(res.body.isPinned, true);
  } finally {
    prisma.userTicketState.findUnique = previousFind;
    prisma.userTicketState.upsert = previousUpsert;
  }
});

test('atualizacao parcial preserva o outro estado e false limpa registro vazio', { concurrency: false }, async () => {
  const previousFind = prisma.userTicketState.findUnique;
  const previousUpsert = prisma.userTicketState.upsert;
  const previousDelete = prisma.userTicketState.delete;
  const pinnedAt = new Date('2026-08-21T12:00:00Z');
  let deleted = false;
  prisma.userTicketState.findUnique = async () => ({
    ticketId: 'ticket-1', isUnread: true, isPinned: true, pinnedAt,
  });
  prisma.userTicketState.upsert = async (args) => ({
    ticketId: 'ticket-1', isUnread: true, isPinned: true, pinnedAt, ...args.update,
  });
  prisma.userTicketState.delete = async () => { deleted = true; };
  try {
    const keepPinned = responseRecorder();
    await updatePreferences(request({ isUnread: false }), keepPinned);
    assert.equal(keepPinned.body.isUnread, false);
    assert.equal(keepPinned.body.isPinned, true);
    assert.equal(keepPinned.body.pinnedAt, pinnedAt);

    prisma.userTicketState.findUnique = async () => ({
      ticketId: 'ticket-1', isUnread: false, isPinned: true, pinnedAt,
    });
    prisma.userTicketState.upsert = async (args) => ({
      ticketId: 'ticket-1', isUnread: false, isPinned: true, pinnedAt, ...args.update,
    });
    const clear = responseRecorder();
    await updatePreferences(request({ isPinned: false }), clear);
    assert.equal(deleted, true);
    assert.deepEqual(clear.body, {
      ticketId: 'ticket-1', isUnread: false, isPinned: false, pinnedAt: null,
    });
  } finally {
    prisma.userTicketState.findUnique = previousFind;
    prisma.userTicketState.upsert = previousUpsert;
    prisma.userTicketState.delete = previousDelete;
  }
});

test('rejeita payload vazio ou valores que nao sejam booleanos', async () => {
  const empty = responseRecorder();
  await updatePreferences(request({}), empty);
  assert.equal(empty.statusCode, 400);

  const invalid = responseRecorder();
  await updatePreferences(request({ isPinned: 'sim' }), invalid);
  assert.equal(invalid.statusCode, 400);
});
