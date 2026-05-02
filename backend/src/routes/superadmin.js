const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { listTenants, createTenant, updateTenant } = require('../controllers/superAdminController');

router.use(authenticate);
router.get('/tenants', listTenants);
router.post('/tenants', createTenant);
router.patch('/tenants/:id', updateTenant);

module.exports = router;
