const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { list, create, getQrCode, repair, remove } = require('../controllers/instanceController');

router.use(authenticate, requirePermission('connections.manage'));
router.get('/list', list);
router.post('/create', create);
router.post('/:id/repair', repair);
router.get('/qrcode/:id', getQrCode);
router.delete('/:id', remove);

module.exports = router;
