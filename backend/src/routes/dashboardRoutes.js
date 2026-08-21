const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { getStats } = require('../controllers/dashboardController');

router.use(authenticate, requirePermission('dashboard.view'));
router.get('/stats', getStats);

module.exports = router;
