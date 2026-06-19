const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const {
  getSummary,
  listCustomers,
  getCustomer,
  listEquipments,
} = require('../controllers/crmController');

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/customers', listCustomers);
router.get('/customers/:id', getCustomer);
router.get('/equipments', listEquipments);

module.exports = router;
