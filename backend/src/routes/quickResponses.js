const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { listQuickResponses, createQuickResponse, deleteQuickResponse } = require('../controllers/quickResponseController');

router.use(authenticate);
router.get('/', listQuickResponses);
router.post('/', createQuickResponse);
router.delete('/:id', deleteQuickResponse);

module.exports = router;
