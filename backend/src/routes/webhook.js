const router = require('express').Router();
const { handleWebhook } = require('../controllers/webhookController');

router.post('/', handleWebhook);

module.exports = router;
