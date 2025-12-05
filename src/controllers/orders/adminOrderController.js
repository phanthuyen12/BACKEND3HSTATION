const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const orderModel = require('../../models/orders/orderModel');
const { buildPagination } = require('../../utils/pagination');
const ApiError = require('../../utils/apiError');

// GET /api/orders/admin/vps - Lấy danh sách đơn hàng VPS
const getVpsOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);

  const orders = await orderModel.listOrders({
    type: 'vps',
    status,
    limit: take,
    offset
  });

  // Join với users và vps_instances để lấy thông tin chi tiết
  const ordersWithDetails = await Promise.all(
    orders.map(async (order) => {
      const userService = require('../../services/userService');
      const user = await userService.getUserById(order.user_id);
      
      // Lấy thông tin VPS instance nếu có
      const vpsInstanceModel = require('../../models/vps/instanceModel');
      const instance = await vpsInstanceModel.getInstanceByOrderId(order.id);
      
      // Lấy thông tin plan nếu có
      let planInfo = null;
      if (order.item_id) {
        const vpsPlanModel = require('../../models/vps/planModel');
        planInfo = await vpsPlanModel.getPlanById(order.item_id);
      }

      return {
        ...order,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        } : null,
        instance: instance || null,
        plan: planInfo || null
      };
    })
  );

  const total = await orderModel.countOrders({
    type: 'vps',
    status
  });

  return successResponse(res, {
    data: ordersWithDetails,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  });
});

// GET /api/orders/admin/workflows - Lấy danh sách đơn hàng workflows
const getWorkflowOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);

  const orders = await orderModel.listOrders({
    type: 'workflow',
    status,
    limit: take,
    offset
  });

  // Join với users và workflows để lấy thông tin chi tiết
  const ordersWithDetails = await Promise.all(
    orders.map(async (order) => {
      const userService = require('../../services/userService');
      const user = await userService.getUserById(order.user_id);
      
      // Lấy thông tin workflow nếu có
      let workflowInfo = null;
      if (order.item_id) {
        const workflowModel = require('../../models/workflows/workflowModel');
        workflowInfo = await workflowModel.getWorkflowById(order.item_id);
      }

      return {
        ...order,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        } : null,
        workflow: workflowInfo || null
      };
    })
  );

  const total = await orderModel.countOrders({
    type: 'workflow',
    status
  });

  return successResponse(res, {
    data: ordersWithDetails,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  });
});

// GET /api/orders/admin/:id - Lấy chi tiết đơn hàng
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await orderModel.getOrderById(id);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Lấy thông tin user
  const userService = require('../../services/userService');
  const user = await userService.getUserById(order.user_id);

  let itemInfo = null;
  if (order.type === 'vps') {
    const vpsInstanceModel = require('../../models/vps/instanceModel');
    const instance = await vpsInstanceModel.getInstanceByOrderId(order.id);
    const vpsPlanModel = require('../../models/vps/planModel');
    if (order.item_id) {
      itemInfo = await vpsPlanModel.getPlanById(order.item_id);
    }
    return successResponse(res, {
      ...order,
      user: user || null,
      instance: instance || null,
      plan: itemInfo || null
    });
  } else if (order.type === 'workflow') {
    const workflowModel = require('../../models/workflows/workflowModel');
    if (order.item_id) {
      itemInfo = await workflowModel.getWorkflowById(order.item_id);
    }
    return successResponse(res, {
      ...order,
      user: user || null,
      workflow: itemInfo || null
    });
  }

  return successResponse(res, {
    ...order,
    user: user || null
  });
});

// PATCH /api/orders/admin/:id/status - Cập nhật trạng thái đơn hàng
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = await orderModel.getOrderById(id);
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const updatedOrder = await orderModel.updateOrder(id, { status });

  // Nếu là đơn hàng VPS và status là 'processing' hoặc 'dang-tao', cập nhật instance status
  if (order.type === 'vps' && (status === 'processing' || status === 'dang-tao')) {
    const vpsInstanceModel = require('../../models/vps/instanceModel');
    const instance = await vpsInstanceModel.getInstanceByOrderId(id);
    if (instance) {
      await vpsInstanceModel.updateInstance(instance.id, { status: 'dang-tao' });
    }
  }

  // Nếu status là 'completed' hoặc 'tao-thanh-cong', cập nhật instance status thành 'active'
  if (order.type === 'vps' && (status === 'completed' || status === 'tao-thanh-cong')) {
    const vpsInstanceModel = require('../../models/vps/instanceModel');
    const instance = await vpsInstanceModel.getInstanceByOrderId(id);
    if (instance) {
      await vpsInstanceModel.updateInstance(instance.id, { status: 'active' });
    }
  }

  return successResponse(res, updatedOrder, 'Order status updated successfully');
});

// PATCH /api/orders/admin/:id/notes - Cập nhật ghi chú/description
const updateOrderNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes, description } = req.body;

  const order = await orderModel.getOrderById(id);
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Cập nhật notes trong order hoặc instance/workflow registration
  if (order.type === 'vps') {
    const vpsInstanceModel = require('../../models/vps/instanceModel');
    const instance = await vpsInstanceModel.getInstanceByOrderId(id);
    if (instance) {
      await vpsInstanceModel.updateInstance(instance.id, { 
        notes: notes || description || instance.notes 
      });
    }
  }

  // Lưu notes vào order metadata nếu có
  // Có thể mở rộng orderModel để lưu metadata
  const updatedOrder = await orderModel.updateOrder(id, {});

  return successResponse(res, { ...updatedOrder, notes: notes || description }, 'Order notes updated successfully');
});

// POST /api/orders/admin/:id/attachment - Thêm file/link đính kèm
const addOrderAttachment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { attachmentUrl, attachmentName, attachmentType } = req.body;

  const order = await orderModel.getOrderById(id);
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Lưu attachment vào instance notes hoặc metadata
  if (order.type === 'vps') {
    const vpsInstanceModel = require('../../models/vps/instanceModel');
    const instance = await vpsInstanceModel.getInstanceByOrderId(id);
    if (instance) {
      const currentNotes = instance.notes || '';
      const attachmentInfo = `\n\n[${attachmentType || 'link'}] ${attachmentName || 'Attachment'}: ${attachmentUrl}`;
      await vpsInstanceModel.updateInstance(instance.id, { 
        notes: currentNotes + attachmentInfo
      });
    }
  }

  return successResponse(res, { 
    orderId: id,
    attachmentUrl,
    attachmentName,
    attachmentType
  }, 'Attachment added successfully');
});

module.exports = {
  getVpsOrders,
  getWorkflowOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderNotes,
  addOrderAttachment
};

