const prisma = require('../lib/prisma');

async function listTenants(req, res) {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { users: true, tickets: true } }
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tenants);
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
