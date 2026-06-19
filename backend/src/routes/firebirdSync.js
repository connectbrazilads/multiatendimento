const router = require('express').Router();
const { pushBatch, getPendingCommands, commandCallback } = require('../controllers/firebirdSyncController');

router.post('/push', pushBatch);
router.get('/pending-commands', getPendingCommands);
router.post('/pending-commands/:id/callback', commandCallback);

module.exports = router;
