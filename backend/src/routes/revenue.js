const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { getRevenueDashboard } = require('../controllers/revenueController');

router.use(authenticate);
router.get('/stats', getRevenueDashboard);

module.exports = router;
