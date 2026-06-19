const router = require('express').Router();
const { pushBatch } = require('../controllers/firebirdSyncController');

router.post('/push', pushBatch);

module.exports = router;
