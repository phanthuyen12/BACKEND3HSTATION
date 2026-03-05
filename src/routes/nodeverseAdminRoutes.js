const express = require('express');
const router = express.Router();
const nodeverseAdminController = require('../controllers/vps/nodeverseAdminController');
const { authenticateByToken } = require('../middlewares/auth');

/**
 * Các API này sử dụng x-api-token hoặc ?api_token của admin để gọi
 */

// Route lấy toàn bộ đơn hàng Nodeverse
router.get('/orders', authenticateByToken, nodeverseAdminController.getOrders);

// Route check chi tiết đơn hàng theo container_id
router.get('/orders/container/:containerId', authenticateByToken, nodeverseAdminController.getOrderDetailsByContainerId);

module.exports = router;
