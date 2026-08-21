const { hasPermission } = require('../auth/permissions');

function requirePermission(...required) {
  return (req, res, next) => {
    if (required.some((permission) => hasPermission(req.user, permission))) return next();
    return res.status(403).json({
      error: 'Voce nao possui permissao para executar esta acao.',
      requiredPermissions: required,
    });
  };
}

module.exports = requirePermission;
