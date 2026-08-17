const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const {
  getSummary,
  listCustomers,
  getCustomer,
  getCustomerContracts,
  getCustomerServiceOrders,
  getCustomer360,
  getReceivableBoleto,
  getReceivableDocuments,
  getReceivableDocument,
  sendReceivableDocuments,
  listFlaggedBillingDocuments,
  listEquipments,
} = require('../controllers/crmController');

router.use(authenticate);

router.get('/summary', asyncRoute(getSummary));
router.get('/customers', asyncRoute(listCustomers));
router.get('/customers/:id', asyncRoute(getCustomer));
router.get('/customers/:id/contracts', asyncRoute(getCustomerContracts));
router.get('/customers/:id/service-orders', asyncRoute(getCustomerServiceOrders));
router.get('/customers/:id/360', asyncRoute(getCustomer360));
router.post('/customers/:id/receivables/:receivableId/boleto', asyncRoute(getReceivableBoleto));
router.get('/customers/:id/receivables/:receivableId/documents', asyncRoute(getReceivableDocuments));
router.post('/customers/:id/receivables/:receivableId/documents/send', asyncRoute(sendReceivableDocuments));
router.post('/customers/:id/receivables/:receivableId/documents/:documentType', asyncRoute(getReceivableDocument));
router.get('/financial/flagged-documents', asyncRoute(listFlaggedBillingDocuments));
router.get('/equipments', asyncRoute(listEquipments));

module.exports = router;
