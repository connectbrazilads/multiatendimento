const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const {
  syncFirebirdContacts,
  testFirebirdConnection,
} = require('../controllers/integrationController');

router.use(authenticate);

router.post('/firebird/test', requirePermission('settings.agent.manage'), testFirebirdConnection);
router.post('/firebird/sync/contacts', requirePermission('settings.agent.manage'), syncFirebirdContacts);

module.exports = router;
