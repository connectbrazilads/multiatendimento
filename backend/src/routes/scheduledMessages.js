const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { schedule, list, remove } = require('../controllers/scheduledMessageController');

router.use(authenticate);
router.get('/', list);
router.post('/', schedule);
router.delete('/:id', remove);

module.exports = router;
