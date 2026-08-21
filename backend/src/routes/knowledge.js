const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');

router.use(authenticate, requirePermission('settings.bot.manage'));

router.get('/', knowledgeController.list);
router.post('/', knowledgeController.create);
router.put('/:id', knowledgeController.update);
router.delete('/:id', knowledgeController.remove);

module.exports = router;
