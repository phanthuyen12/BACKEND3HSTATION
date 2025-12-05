const ApiError = require('../utils/apiError');
const paymentService = require('../services/paymentService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const createPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.createPayment({
    userId: req.user.id,
    courseId: req.body.course_id,
    price: req.body.price,
    method: req.body.method
  });

  return successResponse(res, payment, 'Payment created', 201);
});

const handleWebhook = asyncHandler(async (req, res) => {
  const payment = await paymentService.updatePaymentStatus({
    paymentId: req.body.payment_id,
    status: req.body.status,
    metadata: req.body.metadata || null
  });

  return successResponse(res, payment, 'Webhook processed');
});

const getPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);

  if (req.user.role !== 'admin' && payment.user_id !== req.user.id) {
    throw ApiError.forbidden('Not allowed');
  }

  return successResponse(res, payment);
});

const listUserPayments = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== targetUserId) {
    throw ApiError.forbidden('Not allowed');
  }

  const data = await paymentService.getUserPayments(targetUserId);
  return successResponse(res, data);
});

module.exports = {
  createPayment,
  handleWebhook,
  getPayment,
  listUserPayments
};

















