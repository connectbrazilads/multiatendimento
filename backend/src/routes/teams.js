const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { list, create, update, remove, addMember, removeMember } = require('../controllers/teamController');

router.use(authenticate);
router.get('/', list);
router.use(requirePermission('teams.manage'));
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/members', addMember);
router.delete('/members/:teamId/:userId', removeMember);

module.exports = router;
