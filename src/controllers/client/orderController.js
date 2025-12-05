const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/apiError');
const orderModel = require('../../models/orders/orderModel');

const createOrder = asyncHandler(async (_req, res) => {
  return successResponse(res, { data: { id: '1', type: req.body.type, itemId: req.body.itemId, amount: 0, status: 'pending' } }, 'Order created', 201);
});

// GET /api/client/orders/:id - Lấy chi tiết đơn hàng của user
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const order = await orderModel.getOrderById(id);
  
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Kiểm tra xem đơn hàng có thuộc về user này không
  if (parseInt(order.user_id) !== parseInt(userId)) {
    throw ApiError.forbidden('You do not have permission to view this order');
  }

  // Lấy thông tin chi tiết dựa trên type
  let itemInfo = null;
  let instanceInfo = null;

  if (order.type === 'vps') {
    // Lấy thông tin VPS instance
    const vpsInstanceModel = require('../../models/vps/instanceModel');
    instanceInfo = await vpsInstanceModel.getInstanceByOrderId(order.id);
    
    // Lấy thông tin plan
    if (order.item_id) {
      const vpsPlanModel = require('../../models/vps/planModel');
      itemInfo = await vpsPlanModel.getPlanById(order.item_id);
    }
  } else if (order.type === 'workflow') {
    // Lấy thông tin workflow
    const workflowModel = require('../../models/workflows/workflowModel');
    if (order.item_id) {
      itemInfo = await workflowModel.getWorkflowById(order.item_id);
    }
  } else if (order.type === 'course') {
    // Lấy thông tin course
    const courseModel = require('../../models/courseModel');
    if (order.item_id) {
      itemInfo = await courseModel.getCourseById(order.item_id);
    }
  }

  return successResponse(res, {
    ...order,
    item: itemInfo || null,
    instance: instanceInfo || null
  });
});

const payOrder = asyncHandler(async (_req, res) => {
  return successResponse(res, { data: { id: req.params.id, status: 'paid' } });
});

module.exports = { createOrder, getOrderById, payOrder };













