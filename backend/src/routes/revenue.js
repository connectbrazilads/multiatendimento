const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { 
  getRevenueDashboard, 
  getBenchmark, 
  getDetective, 
  auditTicket, 
  getAuditedTickets,
  getDrilldown
} = require('../controllers/revenueController');

router.use(authenticate, requirePermission('revenue.view'));
router.get('/stats', getRevenueDashboard);
router.get('/benchmark', getBenchmark);
router.get('/detective', getDetective);
router.get('/audit', getAuditedTickets);
router.post('/audit/:ticketId', auditTicket);
router.get('/drilldown/:type', getDrilldown);

module.exports = router;
