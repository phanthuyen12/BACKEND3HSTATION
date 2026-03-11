const asyncHandler = require('../../utils/asyncHandler');
const nodeverseModel = require('../../models/vps/nodeverseModel');
const ApiError = require('../../utils/apiError');

/**
 * Lấy toàn bộ đơn hàng Nodeverse
 * GET /api/admin/nodeverse/orders
 */
const getOrders = asyncHandler(async (req, res) => {
    const { search, page, limit } = req.query;

    const result = await nodeverseModel.listNodeverseOrders({
        search,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
    });

    res.json({
        success: true,
        ...result
    });
});

/**
 * Check chi tiết đơn hàng bằng container_id
 * GET /api/admin/nodeverse/orders/container/:containerId
 */
const getOrderDetailsByContainerId = asyncHandler(async (req, res) => {
    const { containerId } = req.params;

    if (!containerId) {
        throw ApiError.badRequest('Container ID is required');
    }

    const data = await nodeverseModel.getInstanceWithHistoryByContainerId(containerId);

    if (!data) {
        throw ApiError.notFound('Không tìm thấy thông tin với container_id này');
    }

    res.json({
        success: true,
        data: data
    });
});

module.exports = {
    getOrders,
    getOrderDetailsByContainerId
};
