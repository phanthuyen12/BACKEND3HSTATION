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
    type: ['vps', 'nodeverse_vps'],
    status,
    limit: take,
    offset
  });

  // Join với users và vps_instances để lấy thông tin chi tiết
  const ordersWithDetails = await Promise.all(
    orders.map(async (order) => {
      const userService = require('../../services/userService');
      const user = await userService.getUserById(order.user_id);

      let instance = null;
      let planInfo = null;

      if (order.type === 'vps') {
        const vpsInstanceModel = require('../../models/vps/instanceModel');
        instance = await vpsInstanceModel.getInstanceByOrderId(order.id);

        if (order.item_id) {
          const vpsPlanModel = require('../../models/vps/planModel');
          planInfo = await vpsPlanModel.getPlanById(order.item_id);
        }
      } else if (order.type === 'nodeverse_vps') {
        const nodeverseModel = require('../../models/vps/nodeverseModel');
        // Nodeverse instances current API requires query by id, let's fetch all user instances
        const userInstances = await nodeverseModel.listInstances({ userId: order.user_id, limit: 100 });
        instance = userInstances.find(i => Number(i.order_id) === Number(order.id)) || null;

        if (order.item_id) {
          planInfo = await nodeverseModel.getPlanById(order.item_id);
        }
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
    type: ['vps', 'nodeverse_vps'],
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
  } else if (order.type === 'nodeverse_vps') {
    const nodeverseModel = require('../../models/vps/nodeverseModel');
    const instances = await nodeverseModel.listInstances({ userId: order.user_id, limit: 100 });
    const instance = instances.find(i => Number(i.order_id) === Number(order.id)) || null;

    if (order.item_id) {
      itemInfo = await nodeverseModel.getPlanById(order.item_id);
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
  console.log('Updating order status with params:', req.params, req.body);
  const { id } = req.params;
  const { status } = req.body;

  const order = await orderModel.getOrderById(id);
  console.log('Fetched order for status update:', order);
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const updatedOrder = await orderModel.updateOrder(id, { status });

  // Provisioning logic trigger
  if (['completed', 'tao-thanh-cong', 'paid'].includes(status)) {
    console.log('Order status is now active, checking for provisioning:', updatedOrder);
    if (order.type === 'vps' || order.type === 'nodeverse_vps') {
      console.log('Triggering provisioning logic for order:', updatedOrder);
      await provisionNodeverseContainer(order, status);
    }
  }

  return successResponse(res, updatedOrder, 'Order status updated successfully');
});

/** Private Helper: Hanlde auto-provisioning via Nodeverse Containers API */
async function provisionNodeverseContainer(order, status) {
  console.log('Provisioning Nodeverse container for order:', order, 'with status:', status);
  const isVps = order.type === 'vps' ;

  const nodeverseModel = require('../../models/vps/nodeverseModel');
  const instanceModel = isVps ? require('../../models/vps/instanceModel') : null;
  // const nodeverseModel = require('../../models/vps/nodeverseModel'); 
  const planModel = isVps ? require('../../models/vps/planModel') : null;
  const env = require('../../config/env');

  try {
    // 1. Find Instance
    let instance = null;
    if (isVps) {
      instance = await instanceModel.getInstanceByOrderId(order.id);
    } else {
      console.log('Fetching Nodeverse instances for user to find matching order instance...', { orderId: order.id });
      const instances = await nodeverseModel.getInstanceByOrderId(order.id);
      instance = instances; // Assuming getInstanceByOrderId returns the correct instance for the order, otherwise we may need to find it from the list
      // instance = instances.find(i => Number(i.order_id) === Number(order.id));
      console.log('Found Nodeverse instance for provisioning:', instances);
    }
    if (!instance) return;
    const configObj = JSON.parse(instance.configuration);
    console.log('Parsed instance configuration  for provisioning:', configObj);
    const cpuVPS = configObj?.cpu || 1;
    const ramVPS = configObj?.ram || 1;
    const diskVPS = configObj?.ssd || 10;
    const vpsDeviceId = configObj?.nodeverse_device_id || null;
    console.log('Extracted CPU, RAM, Disk for provisioning:', { cpuVPS, ramVPS, diskVPS });

    const payload = {
      vpsDeviceId: vpsDeviceId,
      type: 'n8n', // Default type
      cpu: parseInt(cpuVPS || 1),
      ram: parseInt(ramVPS || 1),
      storage: parseInt(diskVPS || 10)
    };

    console.log('[Nodeverse Container Provision] API Call:', `${env.nodeverse.apiUrl}/vps/containers`);
    console.log('[Nodeverse Container Provision] Body:', JSON.stringify(payload));

    const apiRes = await fetch(`${env.nodeverse.apiUrl}/vps/containers`, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'x-api-key': env.nodeverse.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('[Nodeverse Container Provision] API Response Status:', apiRes.status);
    const data = await apiRes.json();
    console.log('[Nodeverse Container Provision] API Response Body:', data);

    if (apiRes.ok) {
      // Success: Update instance with container details in separate columns
      const updateData = {
        status: 'active',
        deviceName: data.name,
        deviceIp: data.customDomain || data.subdomain || 'N/A',
        deviceHostname: data.subdomain || 'N/A',
        // Key container fields into separate columns
        nodeverseDeviceId: data.vpsDeviceId, // From API: vpsDeviceId
        containerId: data._id,
        agencyId: data.agencyId,
        containerName: data.name,
        containerType: data.type,
        containerStatus: data.status,
        cpu: data.cpu,
        ram: data.ram,
        storage: data.storage,
        ports: Array.isArray(data.ports) ? data.ports.join(',') : String(data.ports || ''),
        subdomain: data.subdomain,
        customDomain: data.customDomain,
        image: data.image,
        // Keep full JSON as backup if needed
        configuration: {
          ...configObj,
          container_data: data,
          provisioned_at: new Date().toISOString()
        },
        notes: (instance.notes || '') + `\n[SUCCESS] Container provisioned: ${data.name} (${data._id})\nURL: ${data.customDomain || data.subdomain}`
      };

      if (isVps) {
        await instanceModel.updateInstance(instance.id, updateData);
      } else {
        console.log('Updating Nodeverse instance with provisioning results...', { instanceId: instance.id, updateData });
        await nodeverseModel.updateInstance(instance.id, updateData);
      }
    } else {
      // Handle API Error
      console.error('[Nodeverse Container Provision] API Error:', data);
      const errorNotes = (instance.notes || '') + `\n[ERROR] Provisioning failed: ${JSON.stringify(data)}`;
      if (isVps) {
        await instanceModel.updateInstance(instance.id, { notes: errorNotes });
      } else {
        await nodeverseModel.updateInstance(instance.id, { notes: errorNotes });
      }
    }

  } catch (err) {
    console.error('[Nodeverse Provision Logic] Failed:', err.message);
  }
}

// PATCH /api/orders/admin/:id/notes - Cập nhật ghi chú/description
const updateOrderNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes, description } = req.body;
  console.log('Updating order notes with params:', req.params, req.body);
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
  } else if (order.type === 'nodeverse_vps') {
    const nodeverseModel = require('../../models/vps/nodeverseModel');
    const instances = await nodeverseModel.listInstances({ userId: order.user_id, limit: 100 });
    const instance = instances.find(i => Number(i.order_id) === Number(id));
    if (instance) {
      await nodeverseModel.updateInstance(instance.id, {
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
  } else if (order.type === 'nodeverse_vps') {
    const nodeverseModel = require('../../models/vps/nodeverseModel');
    const instances = await nodeverseModel.listInstances({ userId: order.user_id, limit: 100 });
    const instance = instances.find(i => Number(i.order_id) === Number(id));
    if (instance) {
      const currentNotes = instance.notes || '';
      const attachmentInfo = `\n\n[${attachmentType || 'link'}] ${attachmentName || 'Attachment'}: ${attachmentUrl}`;
      await nodeverseModel.updateInstance(instance.id, {
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

