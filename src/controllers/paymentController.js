const ApiError = require('../utils/apiError');
const paymentService = require('../services/paymentService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const paymentModuleDisabled = () => {
  throw ApiError.forbidden('Payment is disabled. Course access is managed by rank.');
};

const createPayment = asyncHandler(async (req, res) => {
  paymentModuleDisabled();
});

const handleWebhook = asyncHandler(async (req, res) => {
  paymentModuleDisabled();
});

const getPayment = asyncHandler(async (req, res) => {
  paymentModuleDisabled();
});

const listUserPayments = asyncHandler(async (req, res) => {
  paymentModuleDisabled();
});

module.exports = {
  createPayment,
  handleWebhook,
  getPayment,
  listUserPayments
};















