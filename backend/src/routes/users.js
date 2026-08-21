const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { list, create, update, remove } = require('../controllers/userController');

router.use(authenticate);
router.get('/', list);
router.use(requirePermission('users.manage'));
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
