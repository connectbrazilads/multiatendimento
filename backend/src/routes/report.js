const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authenticate');

router.get('/export', authMiddleware, reportController.exportTickets);

module.exports = router;
