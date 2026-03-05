const express = require('express');
const configController = require('../controllers/configController');
const { authenticate, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// GET /api/configs
router.get('/', configController.getConfigs);

// POST /api/configs (admin only - lưu toàn bộ config)
router.post('/',
    // authenticate,
    // authorizeRoles('admin'),
    configController.updateConfigs
);

module.exports = router;
