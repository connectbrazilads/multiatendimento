const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { list, send } = require('../controllers/internalMessageController');

router.use(authenticate);
router.get('/', list);
router.post('/', send);

module.exports = router;
