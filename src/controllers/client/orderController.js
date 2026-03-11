const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/apiError');
const orderModel = require('../../models/orders/orderModel');
const userModel = require('../../models/userModel');

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

    // Lấy download link nếu có
    if (order.download_link) {
      itemInfo = {
        ...itemInfo,
        downloadLink: order.download_link
      };
    }
  } else if (order.type === 'nodeverse_vps') {
    // Lấy thông tin Nodeverse VPS instance
    const nodeverseModel = require('../../models/vps/nodeverseModel');
    const instances = await nodeverseModel.listInstances({ userId: userId, limit: 100 });

    instanceInfo = instances.find(i => Number(i.order_id) === Number(id)) ||
      instances.find(i => Number(i.id) === Number(order.item_id)) || null;

    if (instanceInfo) {
      itemInfo = await nodeverseModel.getPlanById(instanceInfo.plan_id);
    } else if (order.item_id) {
      itemInfo = await nodeverseModel.getPlanById(order.item_id);
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
    instance: instanceInfo || null,
    downloadLink: order.download_link || null
  });
});

const payOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await orderModel.getOrderById(id);
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Nếu là đơn hàng workflow, tự động assign link chưa bán
  let downloadLink = null;
  if (order.type === 'workflow') {
    try {
      const workflowLinkModel = require('../../models/workflows/workflowLinkModel');
      const availableLink = await workflowLinkModel.getAvailableLink(order.item_id);

      if (availableLink) {
        // Assign link cho order này
        await workflowLinkModel.assignLinkToOrder(availableLink.id, order.id, order.user_id);
        downloadLink = availableLink.download_link;
        console.log('[PAY_ORDER] Assigned workflow link:', downloadLink, 'to order:', order.id);
      } else {
        console.log('[PAY_ORDER] No available workflow link for workflow:', order.item_id);
      }
    } catch (error) {
      console.error('[PAY_ORDER] Error assigning workflow link:', error);
      // Không làm fail payment nếu assign link lỗi
    }
  }

  // Đánh dấu đơn hàng đã thanh toán
  const updatedOrder = await orderModel.updateOrder(id, {
    status: 'paid',
    downloadLink: downloadLink
  });

  // Xử lý hoa hồng ref: 30% giá trị đơn hàng
  try {
    const referralService = require('../../services/referralService');
    await referralService.applyReferralCommission({
      buyerId: order.user_id,
      orderAmount: order.amount
    });
  } catch (e) {
    // Không làm fail payment nếu tính hoa hồng lỗi
    // eslint-disable-next-line no-console
    console.error('Referral commission error:', e);
  }

  return successResponse(res, {
    data: {
      id: updatedOrder.id,
      status: updatedOrder.status,
      downloadLink: downloadLink || updatedOrder.download_link
    }
  });
});

module.exports = { createOrder, getOrderById, payOrder };













