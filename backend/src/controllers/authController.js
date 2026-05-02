const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

async function login(req, res) {
  const { email, password, slug } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });

  const user = await prisma.user.findFirst({
    where: { email },
    include: { tenant: true },
  });

  if (!user || !user.active) return res.status(401).json({ error: 'Credenciais inválidas' });

  // Se o login for feito via portal de empresa, validar se o usuário pertence a ela
  if (slug && user.tenant.slug !== slug) {
    return res.status(401).json({ error: 'Este usuário não possui permissão para acessar esta empresa.' });
  }

  // Se for um usuário comum tentando login global (sem slug), bloquear se não for superadmin
  if (!slug && user.role !== 'superadmin') {
    return res.status(401).json({ error: 'Por favor, utilize o link de acesso exclusivo da sua empresa.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
  });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, role: true, tenantId: true },
  });
  res.json(user);
}

async function getTenantBySlug(req, res) {
  const { slug } = req.params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true }
  });
  if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(tenant);
}

module.exports = { login, me, getTenantBySlug };
