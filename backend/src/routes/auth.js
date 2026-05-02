const router = require('express').Router();
const { login, me, getTenantBySlug } = require('../controllers/authController');
const { updateProfile } = require('../controllers/profileController');
const authenticate = require('../middlewares/authenticate');

router.get('/tenant/:slug', getTenantBySlug);
router.post('/login', login);
router.get('/me', authenticate, me);
router.patch('/profile', authenticate, updateProfile);

module.exports = router;
