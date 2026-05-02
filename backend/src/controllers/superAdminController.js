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
  const { name, slug, plan } = req.body;

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      plan: plan || 'trial',
      settings: { create: {} }
    },
  });
  res.json(tenant);
}

async function updateTenant(req, res) {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;
  const { name, plan, active } = req.body;

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(plan && { plan }),
      ...(active !== undefined && { active }),
    },
  });
  res.json(tenant);
}

module.exports = { listTenants, createTenant, updateTenant };
