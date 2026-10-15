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
    const { containerIds } = req.body;

    if (!Array.isArray(containerIds) || containerIds.length === 0) {
        throw ApiError.badRequest('containerIds must be a non-empty array');
    }

    const results = await Promise.all(
        containerIds.map(id =>
            nodeverseModel.getInstanceWithHistoryByContainerId(id)
        )
    );

    const filtered = results.filter(item => item !== null);

    res.json({
        success: true,
        count: filtered.length,
        data: filtered
    });
});

module.exports = {
    getOrders,
    getOrderDetailsByContainerId
};
