const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');

router.get('/export', authMiddleware, requirePermission('dashboard.view'), reportController.exportTickets);

module.exports = router;
