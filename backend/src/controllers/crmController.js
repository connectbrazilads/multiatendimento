const prisma = require('../lib/prisma');

async function getSummary(req, res) {
  const tenantId = req.user.tenantId;
  const [customers, equipments, linkedEquipments] = await Promise.all([
    prisma.crmCustomer.count({ where: { tenantId } }),
    prisma.crmEquipment.count({ where: { tenantId } }),
    prisma.crmEquipment.count({ where: { tenantId, customerId: { not: null } } }),
  ]);

  res.json({ customers, equipments, linkedEquipments });
}

async function listCustomers(req, res) {
  const tenantId = req.user.tenantId;
  const q = String(req.query.q || '').trim();
  const take = Math.min(Number(req.query.limit || 100) || 100, 250);

  const where = { tenantId };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { fantasyName: { contains: q, mode: 'insensitive' } },
      { cpfCnpj: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { city: { contains: q, mode: 'insensitive' } },
    ];
  }

  const customers = await prisma.crmCustomer.findMany({
    where,
    orderBy: { name: 'asc' },
    take,
    include: {
      _count: { select: { equipments: true } },
      equipments: {
        orderBy: { model: 'asc' },
        take: 8,
      },
    },
  });

  res.json(customers);
}

async function getCustomer(req, res) {
  const customer = await prisma.crmCustomer.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    include: {
      equipments: { orderBy: { model: 'asc' } },
    },
  });

  if (!customer) return res.status(404).json({ error: 'Cliente CRM nao encontrado' });
  res.json(customer);
}

async function listEquipments(req, res) {
  const tenantId = req.user.tenantId;
  const q = String(req.query.q || '').trim();
  const take = Math.min(Number(req.query.limit || 100) || 100, 250);

  const where = { tenantId };
  if (q) {
    where.OR = [
      { model: { contains: q, mode: 'insensitive' } },
      { manufacturer: { contains: q, mode: 'insensitive' } },
      { serialNumber: { contains: q, mode: 'insensitive' } },
      { assetTag: { contains: q, mode: 'insensitive' } },
      { sector: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { customer: { fantasyName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const equipments = await prisma.crmEquipment.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take,
    include: {
      customer: {
        select: { id: true, name: true, fantasyName: true, cpfCnpj: true, phone: true },
      },
    },
  });

  res.json(equipments);
}

module.exports = {
  getSummary,
  listCustomers,
  getCustomer,
  listEquipments,
};
