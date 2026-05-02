const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');
const { list, create, getQrCode, remove } = require('../controllers/instanceController');

router.use(authenticate, isAdmin);
router.get('/list', list);
router.post('/create', create);
router.get('/qrcode/:id', getQrCode);
router.delete('/:id', remove);

module.exports = router;
