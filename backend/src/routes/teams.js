const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');
const { list, create, update, remove, addMember, removeMember } = require('../controllers/teamController');

router.use(authenticate, isAdmin);
router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/members', addMember);
router.delete('/members/:teamId/:userId', removeMember);

module.exports = router;
