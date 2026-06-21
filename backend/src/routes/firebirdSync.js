const router = require('express').Router();
const { pushBatch, getPendingCommands, commandCallback } = require('../controllers/firebirdSyncController');
const { sendBilling, triggerBillingProcess, getBillingLogs, saveBillingSettings } = require('../controllers/billingController');
const upload = require('../middlewares/upload');
const authenticate = require('../middlewares/authenticate');

router.post('/push', pushBatch);
router.get('/pending-commands', getPendingCommands);
router.post('/pending-commands/:id/callback', commandCallback);

// Rotas de Faturamento/Cobrança
router.post('/send-billing', upload.array('media'), sendBilling);
router.post('/trigger-billing-process', authenticate, triggerBillingProcess);
router.get('/billing-logs', authenticate, getBillingLogs);
router.post('/billing-settings', authenticate, saveBillingSettings);

module.exports = router;
