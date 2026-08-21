const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { list, send } = require('../controllers/internalMessageController');

router.use(authenticate, requirePermission('internal_chat.view'));
router.get('/', list);
router.post('/', send);

module.exports = router;
