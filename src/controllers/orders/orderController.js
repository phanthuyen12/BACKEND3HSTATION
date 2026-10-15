const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const createOrder = asyncHandler(async (_req, res) => {
  return successResponse(res, { data: { id: '1', type: req.body.type, itemId: req.body.itemId, amount: 0, status: 'pending' } }, 'Order created', 201);
});

module.exports = { createOrder };













