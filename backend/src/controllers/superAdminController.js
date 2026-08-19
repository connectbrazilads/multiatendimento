const prisma = require('../lib/prisma');

async function listTenants(req, res) {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const tenants = await prisma.tenant.findMany({
    include: {
      // O front usava tenant._count.instances para o contador de conexões,
      // mas o select nunca incluía "instances" - o número ficava sempre 0.
      _count: { select: { users: true, tickets: true, instances: true, contacts: true } },
      instances: { select: { status: true } },
      users: { select: { active: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Métricas de uso real por empresa (mensagens/atividade/tickets abertos).
  // Não dá pra filtrar Message por tenantId direto (só tem via ticket), então
  // é uma consulta por tenant - tranquilo na escala atual do painel (dezenas
  // de empresas, não milhares), e é uma tela de admin, não um hot path.
  const enriched = await Promise.all(tenants.map(async (tenant) => {
    const [messages30d, lastTicket, openTickets] = await Promise.all([
      prisma.message.count({
        where: { ticket: { tenantId: tenant.id }, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.ticket.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { lastMessageAt: 'desc' },
        select: { lastMessageAt: true, updatedAt: true },
      }),
      prisma.ticket.count({ where: { tenantId: tenant.id, status: { in: ['pending', 'open'] } } }),
    ]);
    const connectedInstances = tenant.instances.filter((i) => String(i.status || '').toLowerCase() === 'connected').length;
    const activeUsers = tenant.users.filter((u) => u.active).length;
    return {
      ...tenant,
      instances: undefined,
      users: undefined,
      metrics: {
        connectedInstances,
        activeUsers,
        messages30d,
        openTickets,
        lastActivityAt: lastTicket?.lastMessageAt || lastTicket?.updatedAt || null,
      },
    };
  }));

  res.json(enriched);
}

async function createTenant(req, res) {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  const { name, slug, plan, maxConnections, maxUsers } = req.body;
  console.log(`[superadminController] Criando novo tenant:`, { name, slug, maxConnections, maxUsers });

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      plan: plan || 'trial',
      maxConnections: Number(maxConnections) || 1,
      maxUsers: Number(maxUsers) || 5,
      settings: { create: {} }
    },
  });
  res.json(tenant);
}

async function updateTenant(req, res) {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;
  const { name, plan, active, maxConnections, maxUsers, primaryColor, logoUrl } = req.body;

  console.log(`[superadminController] Atualizando tenant ${id}:`, { maxConnections, maxUsers });

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(plan && { plan }),
      ...(active !== undefined && { active }),
      ...(maxConnections !== undefined && { maxConnections: Number(maxConnections) }),
      ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(logoUrl !== undefined && { logoUrl }),
    },
  });
  res.json(tenant);
}

module.exports = { listTenants, createTenant, updateTenant };
