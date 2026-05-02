const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');
const { getSettings, saveSettings, getBusinessHours, saveBusinessHours } = require('../controllers/settingsController');

router.use(authenticate);
router.get('/', getSettings);
router.post('/', isAdmin, saveSettings);
router.get('/business-hours', getBusinessHours);
router.post('/business-hours', isAdmin, saveBusinessHours);

module.exports = router;
