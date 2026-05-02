const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { sendBulk } = require('../controllers/campaignController');

router.use(authenticate);
router.post('/send', sendBulk);

module.exports = router;
