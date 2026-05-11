const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { list, create, update, remove } = require('../controllers/userController');

router.use(authenticate);
router.get('/', list);
router.use(require('../middlewares/isAdmin'));
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
