const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { schedule, list, remove } = require('../controllers/scheduledMessageController');

router.use(authenticate, requirePermission('inbox.view'));
router.get('/', list);
router.post('/', schedule);
router.delete('/:id', remove);

module.exports = router;
