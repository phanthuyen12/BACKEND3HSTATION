const vpsService = require('../../services/client/vpsService');
const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const listPlans = asyncHandler(async (_req, res) => {
  const data = await vpsService.listPlans();
  return successResponse(res, data);
});

// GET bảng giá chi tiết theo chu kỳ cho 1 gói VPS
const getPlanPricing = asyncHandler(async (req, res) => {
  const data = await vpsService.getPlanPricing(req.params.id);
  return successResponse(res, data);
});

const createOrder = asyncHandler(async (req, res) => {
  const result = await vpsService.createOrder({
    userId: req.user.id,
    planId: req.body.planId,
    paymentMethod: req.body.paymentMethod || 'balance',
    billingTermCode: req.body.billingTermCode || '1m',
    autoRenew: req.body.autoRenew === true
  });
  return successResponse(
    res,
    result,
    'Đơn hàng VPS đã được tạo thành công. Vui lòng đợi admin cấu hình.',
    201
  );
});

module.exports = {
  listPlans,
  getPlanPricing,
  createOrder
};













