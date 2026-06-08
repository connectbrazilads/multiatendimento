const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { 
  getRevenueDashboard, 
  getBenchmark, 
  getDetective, 
  auditTicket, 
  getAuditedTickets 
} = require('../controllers/revenueController');

router.use(authenticate);
router.get('/stats', getRevenueDashboard);
router.get('/benchmark', getBenchmark);
router.get('/detective', getDetective);
router.get('/audit', getAuditedTickets);
router.post('/audit/:ticketId', auditTicket);

module.exports = router;
