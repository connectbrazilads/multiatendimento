const prisma = require('../src/lib/prisma');
const { normalizePhoneNumber } = require('../src/services/evolutionService');

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');
const ACTIVE_STATUSES = new Set(['pending', 'open', 'bot']);

function nonEmpty(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function safeTags(raw) {
  if (!nonEmpty(raw)) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(nonEmpty) : [];
  } catch {
    return [];
  }
}

function mergeTags(...values) {
  return JSON.stringify(Array.from(new Set(values.flatMap(safeTags))));
}

function getContactStrength(contact) {
  const filledFields = [
    contact.name,
    contact.fantasyName,
    contact.cpfCnpj,
    contact.email,
    contact.address,
    contact.city,
    contact.state,
    contact.zipCode,
    contact.notes,
    contact.avatarUrl,
    contact.whatsapp,
  ].filter(nonEmpty).length;

  return {
    activeTickets: contact.tickets.filter((ticket) => ACTIVE_STATUSES.has(ticket.status)).length,
    totalTickets: contact.tickets.length,
    equipments: contact.equipments.length,
    serviceOrders: contact.serviceOrders.length,
    scheduledMessages: contact.scheduledMessages.length,
    filledFields,
  };
}

function compareContacts(left, right) {
  const a = getContactStrength(left);
  const b = getContactStrength(right);

  const checks = [
    b.activeTickets - a.activeTickets,
    b.totalTickets - a.totalTickets,
    b.serviceOrders - a.serviceOrders,
    b.equipments - a.equipments,
    b.scheduledMessages - a.scheduledMessages,
    b.filledFields - a.filledFields,
  ];

  for (const diff of checks) {
    if (diff !== 0) return diff;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function pickPrimaryTicket(tickets) {
  const statusWeight = { open: 3, pending: 2, bot: 1 };
  return [...tickets].sort((left, right) => {
    const byStatus = (statusWeight[right.status] || 0) - (statusWeight[left.status] || 0);
    if (byStatus !== 0) return byStatus;

    const byAgent = Number(Boolean(right.agentId)) - Number(Boolean(left.agentId));
    if (byAgent !== 0) return byAgent;

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  })[0];
}

function buildEquipmentKey(equipment) {
  const model = String(equipment.model || '').trim().toLowerCase();
  const serial = String(equipment.serialNumber || '').trim().toLowerCase();
  const manufacturer = String(equipment.manufacturer || '').trim().toLowerCase();
  if (!model) return null;
  return `${manufacturer}|${model}|${serial}`;
}

function buildMergeNote(source) {
  const details = [];
  if (nonEmpty(source.name)) details.push(`Nome alternativo: ${source.name}`);
  if (nonEmpty(source.fantasyName)) details.push(`Fantasia alternativa: ${source.fantasyName}`);
  if (nonEmpty(source.cpfCnpj)) details.push(`CPF/CNPJ alternativo: ${source.cpfCnpj}`);
  if (nonEmpty(source.email)) details.push(`Email alternativo: ${source.email}`);

  const addressBits = [source.address, source.city, source.state, source.zipCode].filter(nonEmpty);
  if (addressBits.length > 0) details.push(`Endereco alternativo: ${addressBits.join(', ')}`);
  if (nonEmpty(source.whatsapp)) details.push(`WhatsApp vinculado antigo: ${source.whatsapp}`);

  if (details.length === 0) return '';
  return `[merge ${new Date().toISOString()}] Registro mesclado de ${source.id}\n${details.join('\n')}`;
}

function mergeContactFields(target, source, normalizedPhone) {
  const next = {};

  if (target.phone !== normalizedPhone) {
    next.phone = normalizedPhone;
  }

  if (!nonEmpty(target.name) && nonEmpty(source.name)) next.name = source.name;
  if (!nonEmpty(target.fantasyName) && nonEmpty(source.fantasyName)) next.fantasyName = source.fantasyName;
  if (!nonEmpty(target.cpfCnpj) && nonEmpty(source.cpfCnpj)) next.cpfCnpj = source.cpfCnpj;
  if (!nonEmpty(target.email) && nonEmpty(source.email)) next.email = source.email;
  if (!nonEmpty(target.address) && nonEmpty(source.address)) next.address = source.address;
  if (!nonEmpty(target.city) && nonEmpty(source.city)) next.city = source.city;
  if (!nonEmpty(target.state) && nonEmpty(source.state)) next.state = source.state;
  if (!nonEmpty(target.zipCode) && nonEmpty(source.zipCode)) next.zipCode = source.zipCode;
  if (!nonEmpty(target.avatarUrl) && nonEmpty(source.avatarUrl)) next.avatarUrl = source.avatarUrl;
  if (!nonEmpty(target.whatsapp) && nonEmpty(source.whatsapp)) next.whatsapp = normalizePhoneNumber(source.whatsapp);

  const mergedTags = mergeTags(target.tags, source.tags);
  if (mergedTags !== (target.tags || '[]')) next.tags = mergedTags;

  const mergeNote = buildMergeNote(source);
  if (mergeNote) {
    const notes = [target.notes, mergeNote].filter(nonEmpty).join('\n\n');
    if (notes !== (target.notes || '')) next.notes = notes;
  }

  return next;
}

async function loadContacts() {
  return prisma.contact.findMany({
    include: {
      tickets: {
        select: {
          id: true,
          status: true,
          agentId: true,
          teamId: true,
          instanceId: true,
          unreadCount: true,
          priority: true,
          subject: true,
          updatedAt: true,
          createdAt: true,
          firstResponseAt: true,
          lastCustomerMessageAt: true,
        },
      },
      equipments: {
        select: {
          id: true,
          model: true,
          manufacturer: true,
          serialNumber: true,
          createdAt: true,
        },
      },
      scheduledMessages: { select: { id: true } },
      serviceOrders: { select: { id: true, ticketId: true, equipmentId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

function groupDuplicates(contacts) {
  const groups = new Map();

  for (const contact of contacts) {
    const normalizedPhone = normalizePhoneNumber(contact.phone || '');
    if (!normalizedPhone) continue;

    const key = `${contact.tenantId}:${normalizedPhone}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(contact);
  }

  return [...groups.entries()]
    .map(([key, items]) => ({ key, normalizedPhone: key.split(':').slice(1).join(':'), items }))
    .filter((group) => group.items.length > 1);
}

async function mergeTickets(tx, targetContactId, log) {
  const tickets = await tx.ticket.findMany({
    where: { contactId: targetContactId },
    orderBy: { updatedAt: 'desc' },
  });

  const activeTickets = tickets.filter((ticket) => ACTIVE_STATUSES.has(ticket.status));
  if (activeTickets.length <= 1) return;

  const primary = pickPrimaryTicket(activeTickets);
  const redundant = activeTickets.filter((ticket) => ticket.id !== primary.id);

  let unreadCount = primary.unreadCount || 0;
  let firstResponseAt = primary.firstResponseAt;
  let lastCustomerMessageAt = primary.lastCustomerMessageAt;
  let agentId = primary.agentId;
  let teamId = primary.teamId;
  let instanceId = primary.instanceId;
  let subject = primary.subject;
  let priority = primary.priority;
  let latestUpdatedAt = primary.updatedAt;

  for (const ticket of redundant) {
    unreadCount += ticket.unreadCount || 0;
    if (!firstResponseAt || (ticket.firstResponseAt && new Date(ticket.firstResponseAt) < new Date(firstResponseAt))) {
      firstResponseAt = ticket.firstResponseAt;
    }
    if (!lastCustomerMessageAt || (ticket.lastCustomerMessageAt && new Date(ticket.lastCustomerMessageAt) > new Date(lastCustomerMessageAt))) {
      lastCustomerMessageAt = ticket.lastCustomerMessageAt;
    }
    if (!agentId && ticket.agentId) agentId = ticket.agentId;
    if (!teamId && ticket.teamId) teamId = ticket.teamId;
    if (!instanceId && ticket.instanceId) instanceId = ticket.instanceId;
    if (!subject && ticket.subject) subject = ticket.subject;
    if (priority === 'medium' && ticket.priority && ticket.priority !== 'medium') priority = ticket.priority;
    if (new Date(ticket.updatedAt) > new Date(latestUpdatedAt)) latestUpdatedAt = ticket.updatedAt;

    await tx.message.updateMany({
      where: { ticketId: ticket.id },
      data: { ticketId: primary.id },
    });
    await tx.ticketEvent.updateMany({
      where: { ticketId: ticket.id },
      data: { ticketId: primary.id },
    });
    await tx.serviceOrder.updateMany({
      where: { ticketId: ticket.id },
      data: { ticketId: primary.id },
    });
    await tx.ticket.delete({ where: { id: ticket.id } });

    log.mergedTickets.push({ from: ticket.id, to: primary.id, status: ticket.status });
  }

  await tx.ticket.update({
    where: { id: primary.id },
    data: {
      unreadCount,
      firstResponseAt,
      lastCustomerMessageAt,
      agentId,
      teamId,
      instanceId,
      subject,
      priority,
      updatedAt: latestUpdatedAt,
    },
  });
}

async function mergeGroup(tx, group, applyChanges) {
  const contactIds = group.items.map((item) => item.id);
  const contacts = await tx.contact.findMany({
    where: { id: { in: contactIds } },
    include: {
      tickets: {
        select: {
          id: true,
          status: true,
          agentId: true,
          teamId: true,
          instanceId: true,
          unreadCount: true,
          priority: true,
          subject: true,
          updatedAt: true,
          createdAt: true,
          firstResponseAt: true,
          lastCustomerMessageAt: true,
        },
      },
      equipments: {
        select: {
          id: true,
          model: true,
          manufacturer: true,
          serialNumber: true,
          createdAt: true,
        },
      },
      scheduledMessages: { select: { id: true } },
      serviceOrders: { select: { id: true, ticketId: true, equipmentId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const sorted = [...contacts].sort(compareContacts);
  const target = sorted[0];
  const sources = sorted.slice(1);
  const log = {
    normalizedPhone: group.normalizedPhone,
    target: { id: target.id, name: target.name, phone: target.phone },
    removedContacts: [],
    movedEquipments: [],
    mergedEquipments: [],
    mergedTickets: [],
    movedTickets: 0,
    movedServiceOrders: 0,
    movedScheduledMessages: 0,
    contactUpdates: {},
  };

  const targetEquipmentMap = new Map(target.equipments.map((equipment) => [buildEquipmentKey(equipment), equipment]));
  let pendingTarget = { ...target };

  for (const source of sources) {
    log.removedContacts.push({ id: source.id, name: source.name, phone: source.phone });
    const nextFields = mergeContactFields(pendingTarget, source, group.normalizedPhone);
    pendingTarget = { ...pendingTarget, ...nextFields };
    Object.assign(log.contactUpdates, nextFields);

    for (const equipment of source.equipments) {
      const key = buildEquipmentKey(equipment);
      const existingEquipment = key ? targetEquipmentMap.get(key) : null;

      if (existingEquipment) {
        if (applyChanges) {
          await tx.serviceOrder.updateMany({
            where: { equipmentId: equipment.id },
            data: { equipmentId: existingEquipment.id, contactId: target.id },
          });
          await tx.equipment.delete({ where: { id: equipment.id } });
        }
        log.mergedEquipments.push({ from: equipment.id, to: existingEquipment.id });
      } else {
        if (applyChanges) {
          await tx.equipment.update({
            where: { id: equipment.id },
            data: { contactId: target.id },
          });
        }
        targetEquipmentMap.set(key, { ...equipment, contactId: target.id });
        log.movedEquipments.push({ id: equipment.id, model: equipment.model });
      }
    }

    if (applyChanges) {
      const scheduledMoved = await tx.scheduledMessage.updateMany({
        where: { contactId: source.id },
        data: { contactId: target.id },
      });
      log.movedScheduledMessages += scheduledMoved.count;

      const serviceOrdersMoved = await tx.serviceOrder.updateMany({
        where: { contactId: source.id },
        data: { contactId: target.id },
      });
      log.movedServiceOrders += serviceOrdersMoved.count;

      const ticketsMoved = await tx.ticket.updateMany({
        where: { contactId: source.id },
        data: { contactId: target.id },
      });
      log.movedTickets += ticketsMoved.count;
    } else {
      log.movedScheduledMessages += source.scheduledMessages.length;
      log.movedServiceOrders += source.serviceOrders.length;
      log.movedTickets += source.tickets.length;
    }

    if (applyChanges) {
      await tx.contact.delete({ where: { id: source.id } });
    }
  }

  if (applyChanges && Object.keys(log.contactUpdates).length > 0) {
    await tx.contact.update({
      where: { id: target.id },
      data: log.contactUpdates,
    });
  }

  if (applyChanges) {
    await mergeTickets(tx, target.id, log);
  }

  return log;
}

async function run() {
  const contacts = await loadContacts();
  const groups = groupDuplicates(contacts);
  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    duplicateGroups: groups.length,
    affectedContacts: groups.reduce((total, group) => total + group.items.length, 0),
    groups: [],
  };

  if (groups.length === 0) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  for (const group of groups) {
    if (APPLY) {
      const log = await prisma.$transaction((tx) => mergeGroup(tx, group, true), { timeout: 60000 });
      summary.groups.push(log);
    } else {
      const log = await prisma.$transaction((tx) => mergeGroup(tx, group, false), { timeout: 60000 });
      summary.groups.push(log);
    }
  }

  if (!VERBOSE) {
    summary.groups = summary.groups.map((group) => ({
      normalizedPhone: group.normalizedPhone,
      target: group.target,
      removedContacts: group.removedContacts,
      movedTickets: group.movedTickets,
      movedServiceOrders: group.movedServiceOrders,
      movedScheduledMessages: group.movedScheduledMessages,
      movedEquipments: group.movedEquipments.length,
      mergedEquipments: group.mergedEquipments.length,
      mergedTickets: group.mergedTickets.length,
      contactUpdates: group.contactUpdates,
    }));
  }

  console.log(JSON.stringify(summary, null, 2));
}

run()
  .catch((error) => {
    console.error('[dedupeContacts] erro:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
