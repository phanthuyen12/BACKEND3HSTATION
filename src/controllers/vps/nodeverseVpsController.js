const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const nodeverseVpsService = require('../../services/vps/nodeverseVpsService');

// ──── ADMIN ───────────────────────────────────────────────────────────────

/** POST /api/vps/nodeverse-plans/sync — Sync devices từ Nodeverse vào DB */
const syncPlans = asyncHandler(async (_req, res) => {
    const data = await nodeverseVpsService.syncDevicesFromNodeverse();
    return successResponse(res, data, `Đã sync ${data.synced} VPS devices từ Nodeverse`);
});

/** GET /api/vps/nodeverse-plans — Danh sách plans (admin) */
const adminListPlans = asyncHandler(async (req, res) => {
    const data = await nodeverseVpsService.adminListPlans({ search: req.query.search });
    return successResponse(res, data);
});

/** PUT /api/vps/nodeverse-plans/:id — Cập nhật giá, trạng thái bán */
const adminUpdatePlan = asyncHandler(async (req, res) => {
    const data = await nodeverseVpsService.adminUpdatePlan(req.params.id, req.body);
    return successResponse(res, data, 'Đã cập nhật plan Nodeverse VPS');
});

/** GET /api/vps/nodeverse-plans/instances — Danh sách đơn hàng (admin) */
const adminListInstances = asyncHandler(async (req, res) => {
    const data = await nodeverseVpsService.adminListInstances({
        userId: req.query.userId ? parseInt(req.query.userId) : undefined,
        status: req.query.status,
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
    });
    return successResponse(res, data);
});

/** GET /api/vps/nodeverse-plans/stats — Lấy thống kê chung */
const adminGetGeneralStats = asyncHandler(async (req, res) => {
    const data = await nodeverseVpsService.adminGetGeneralStats();
    return successResponse(res, data);
});

/** GET /api/vps/nodeverse-plans/stats/:deviceId — Lấy thống kê theo deviceId */
const adminGetStatsByDeviceId = asyncHandler(async (req, res) => {
    const data = await nodeverseVpsService.adminGetStatsByDeviceId(req.params.deviceId);
    return successResponse(res, data);
});

// ──── CLIENT ──────────────────────────────────────────────────────────────

/** GET /api/client/vps/nodeverse-plans — Danh sách plans đang mở bán */
const clientListPlans = asyncHandler(async (_req, res) => {
    const data = await nodeverseVpsService.clientListPlans();
    return successResponse(res, data);
});

/** GET /api/client/vps/nodeverse-plans/:id/pricing — Bảng giá theo chu kỳ */
const getPlanPricing = asyncHandler(async (req, res) => {
    const data = await nodeverseVpsService.getPlanPricing(req.params.id);
    return successResponse(res, data);
});

/** POST /api/client/vps/nodeverse-plans/order — Đặt hàng VPS Nodeverse */
const createOrder = asyncHandler(async (req, res) => {
    const { planId, paymentMethod, billingTermCode, autoRenew, osVersion, nodeverseDeviceId, nodeverseAgencyId } = req.body;

    const data = await nodeverseVpsService.createOrder({
        userId: req.user.id,
        planId,
        paymentMethod,
        billingTermCode,
        autoRenew,
        osVersion,
        nodeverseDeviceId,
        nodeverseAgencyId
    });
    return successResponse(res, data, 'Đặt hàng VPS Nodeverse thành công', 201);
});

/** GET /api/client/vps/nodeverse-plans/my-orders — Đơn hàng của tôi */
const getMyOrders = asyncHandler(async (req, res) => {
    const data = await nodeverseVpsService.getMyOrders(req.user.id);
    return successResponse(res, data);
});

/** GET /api/client/vps/nodeverse-plans/my-orders/:id — Chi tiết đơn hàng của tôi */
const getMyOrderById = asyncHandler(async (req, res) => {
    const data = await nodeverseVpsService.getMyOrderById(req.user.id, req.params.id);
    return successResponse(res, data);
});

/** POST /api/client/vps/nodeverse-plans/my-orders/:id/:action — Chạy các lệnh start/stop/restart */
const manageContainerState = asyncHandler(async (req, res) => {
    const { id, action } = req.params;
    if (!["start", "stop", "restart"].includes(action)) {
        return res.status(400).json({ success: false, message: "Hành động lấy không hợp lệ hoặc không hỗ trợ" });
    }
    const data = await nodeverseVpsService.changeContainerState(req.user.id, id, action);
    return successResponse(res, data, data.message);
});

/** POST /api/client/vps/nodeverse-plans/my-orders/:id/renew — Gia hạn VPS Nodeverse */
const renewOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { billingTermCode, paymentMethod } = req.body;

    const data = await nodeverseVpsService.renewOrder({
        userId: req.user.id,
        instanceId: id,
        billingTermCode,
        paymentMethod
    });
    return successResponse(res, data, 'Gia hạn VPS Nodeverse thành công');
});

/** PUT /api/vps/nodeverse-plans/instances/:id — Cập nhật instance (admin) */
const adminUpdateInstance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await nodeverseVpsService.adminUpdateInstance(id, req.body);
    return successResponse(res, data, 'Đã cập nhật VPS instance');
});

/** GET /api/vps/nodeverse-plans/instances/:id — Lấy chi tiết instance (admin) */
const adminGetInstanceDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await nodeverseVpsService.adminGetInstanceDetail(id);
    return successResponse(res, data);
});

/** GET /api/vps/nodeverse-plans/instances/:id/history — Lấy lịch sử gia hạn VPS (admin) */
const adminGetInstanceHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await nodeverseVpsService.adminGetInstanceHistory(id);
    return successResponse(res, data);
});

/** POST /api/vps/nodeverse-plans/instances/:id/send-activation-email — Gửi email kích hoạt thủ công */
const adminSendActivationEmail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await nodeverseVpsService.sendActivationEmail(id);
    return successResponse(res, data, 'Đã gửi email kích hoạt VPS');
});

module.exports = {
    syncPlans,
    adminListPlans,
    adminUpdatePlan,
    adminListInstances,
    adminUpdateInstance,
    adminGetInstanceDetail,
    adminGetInstanceHistory,
    adminSendActivationEmail,
    adminGetGeneralStats,
    adminGetStatsByDeviceId,
    clientListPlans,
    getPlanPricing,
    createOrder,
    renewOrder,
    getMyOrders,
    getMyOrderById,
    manageContainerState
};
