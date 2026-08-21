const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const leadController = require('../controllers/leadController');

router.use(auth, requirePermission('leads.manage'));

router.get('/', leadController.getLeads);
router.get('/instances', leadController.getLeadInstances);
router.post('/search', leadController.searchLeads);
router.post('/manual', leadController.createManualLeads);
router.post('/send', leadController.sendToLeads);
router.delete('/all', leadController.deleteAllLeads);
router.delete('/:id', leadController.deleteLead);

module.exports = router;
