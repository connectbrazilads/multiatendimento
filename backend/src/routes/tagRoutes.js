const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { list, create, update, remove } = require('../controllers/tagController');

router.use(authenticate);
router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
