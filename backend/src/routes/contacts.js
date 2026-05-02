const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { list, getHistory, updateContact, getMedia, create, getTags } = require('../controllers/contactController');

router.use(authenticate);
router.get('/', list);
router.post('/', create);
router.get('/tags', getTags);
router.get('/:id/history', getHistory);
router.patch('/:id', updateContact);
router.get('/:id/media', getMedia);

module.exports = router;
