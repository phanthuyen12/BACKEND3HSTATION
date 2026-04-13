const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorizeRoles } = require('../middlewares/auth');

router.get('/stats', authenticate, authorizeRoles('admin'), dashboardController.getStats);

module.exports = router;
