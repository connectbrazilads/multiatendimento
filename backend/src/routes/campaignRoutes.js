const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { sendBulk } = require('../controllers/campaignController');

router.use(authenticate, requirePermission('campaigns.manage'));
router.post('/send', sendBulk);

module.exports = router;
