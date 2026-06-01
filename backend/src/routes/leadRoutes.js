const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authenticate');
const leadController = require('../controllers/leadController');

router.use(auth);

router.get('/', leadController.getLeads);
router.post('/search', leadController.searchLeads);
router.post('/send', leadController.sendToLeads);
router.delete('/all', leadController.deleteAllLeads);
router.delete('/:id', leadController.deleteLead);

module.exports = router;
