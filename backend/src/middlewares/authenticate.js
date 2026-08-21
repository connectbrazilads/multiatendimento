const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { resolveUserAccess } = require('../auth/permissions');

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;
  let token;

  if (auth && auth.startsWith('Bearer ')) token = auth.slice(7);
  else if (req.query.token) token = req.query.token;

  if (!token) return res.status(401).json({ error: 'Token obrigatorio' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.userId) return res.status(401).json({ error: 'Token invalido' });

    // O token identifica a sessao; status, tenant e permissoes sempre vem do banco.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
        accessProfile: true,
        permissions: true,
        active: true,
        tenant: { select: { active: true } },
      },
    });

    if (!user || !user.active || !user.tenant?.active) {
      return res.status(401).json({ error: 'Usuario inativo ou nao encontrado' });
    }

    const access = resolveUserAccess(user);
    req.user = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      accessProfile: access.profile,
      permissions: access.permissions,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido' });
  }
};
