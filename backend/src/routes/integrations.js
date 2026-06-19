const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');
const {
  syncFirebirdContacts,
  testFirebirdConnection,
} = require('../controllers/integrationController');

router.use(authenticate);

router.post('/firebird/test', isAdmin, testFirebirdConnection);
router.post('/firebird/sync/contacts', isAdmin, syncFirebirdContacts);

module.exports = router;
