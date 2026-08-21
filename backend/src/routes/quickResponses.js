const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { listQuickResponses, createQuickResponse, deleteQuickResponse } = require('../controllers/quickResponseController');

router.use(authenticate, requirePermission('quick_responses.manage'));
router.get('/', listQuickResponses);
router.post('/', createQuickResponse);
router.delete('/:id', deleteQuickResponse);

module.exports = router;
