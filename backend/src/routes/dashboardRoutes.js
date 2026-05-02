const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { getStats } = require('../controllers/dashboardController');

router.use(authenticate);
router.get('/stats', getStats);

module.exports = router;
