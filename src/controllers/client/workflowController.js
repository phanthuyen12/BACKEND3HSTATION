const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const workflowService = require('../../services/workflows/workflowService');
const registrationService = require('../../services/workflows/registrationService');
const registrationModel = require('../../models/workflows/registrationModel');

const listWorkflows = asyncHandler(async (req, res) => {
  // Only show active workflows for client
  const data = await workflowService.listWorkflows({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    search: req.query.search,
    category: req.query.category
  });
  
  // Filter only active workflows
  const activeWorkflows = data.data.filter(w => w.status === 'active');
  const total = activeWorkflows.length;
  
  return successResponse(res, {
    data: activeWorkflows,
    pagination: {
      ...data.pagination,
      total
    }
  });
});

const getWorkflowById = asyncHandler(async (req, res) => {
  const workflow = await workflowService.getWorkflowById(req.params.id);
  
  // Only return if workflow is active
  if (workflow.status !== 'active') {
    const ApiError = require('../../utils/apiError');
    throw ApiError.notFound('Workflow not found');
  }
  
  return successResponse(res, { data: workflow });
});

const registerWorkflow = asyncHandler(async (req, res) => {
  const ApiError = require('../../utils/apiError');
  const referralService = require('../../services/referralService');
  const userModel = require('../../models/userModel');
  const orderModel = require('../../models/orders/orderModel');
  
  // Use userId from authenticated user
  const userId = req.user?.id;
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Verify workflow exists and is active
  const workflow = await workflowService.getWorkflowById(req.params.id);
  if (workflow.status !== 'active') {
    throw ApiError.badRequest('Workflow is not available for registration');
  }

  // Check if user already registered
  const existingRegistrations = await registrationService.listRegistrations({
    page: 1,
    limit: 1,
    workflowId: parseInt(req.params.id),
    status: null,
    search: null
  });
  
  const existing = existingRegistrations.data.find(r => r.user_id === parseInt(userId));
  if (existing && existing.status !== 'da-huy') {
    throw ApiError.badRequest('Bạn đã đăng ký workflow này rồi');
  }

  // Get user balance
  const user = await userModel.getUserById(parseInt(userId));
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const workflowPrice = parseFloat(workflow.price || 0);
  const isFree = workflowPrice === 0;

    // If workflow is not free, check balance and deduct
  if (!isFree && workflowPrice > 0) {
    const userBalance = parseFloat(user.balance || 0);
    if (userBalance < workflowPrice) {
      throw ApiError.badRequest('Số dư tài khoản không đủ để đăng ký workflow này');
    }

    // Deduct balance
    const newBalance = userBalance - workflowPrice;
    await userModel.updateUser(parseInt(userId), { balance: newBalance });
  }

  try {
    // Create order
    const order = await orderModel.createOrder({
      userId: parseInt(userId),
      type: 'workflow',
      itemId: String(req.params.id),
      amount: workflowPrice,
      paymentMethod: 'balance',
      status: isFree ? 'paid' : 'paid'
    });

    // Nếu đã thanh toán, tự động assign link workflow
    let downloadLink = null;
    if (order.status === 'paid') {
      try {
        const workflowLinkModel = require('../../models/workflows/workflowLinkModel');
        const availableLink = await workflowLinkModel.getAvailableLink(parseInt(req.params.id));
        
        if (availableLink) {
          await workflowLinkModel.assignLinkToOrder(availableLink.id, order.id, parseInt(userId));
          downloadLink = availableLink.download_link;
          await orderModel.updateOrder(order.id, { downloadLink });
          console.log('[REGISTER_WORKFLOW] Assigned link:', downloadLink, 'to order:', order.id);
        }
      } catch (linkError) {
        console.error('[REGISTER_WORKFLOW] Error assigning link:', linkError);
        // Không làm fail registration nếu assign link lỗi
      }
    }

    // Create registration (auto approved)
    const registration = await registrationModel.createRegistration({
      userId: parseInt(userId),
      workflowId: parseInt(req.params.id)
    });

    // Apply referral commission (30%) if order is paid
    if (order.status === 'paid') {
      await referralService.applyReferralCommission({
        buyerId: userId,
        orderAmount: workflowPrice
      });
    }

    return successResponse(res, { 
      data: { 
        registration, 
        order: {
          ...order,
          downloadLink: downloadLink
        },
        downloadLink: downloadLink,
        message: 'Đăng ký workflow thành công. Vui lòng đợi admin duyệt.' 
      } 
    }, 'Đăng ký workflow thành công', 201);
  } catch (error) {
    // Rollback: refund balance if deducted
    if (!isFree && workflowPrice > 0) {
      const user = await userModel.getUserById(parseInt(userId));
      const currentBalance = parseFloat(user.balance || 0);
      await userModel.updateUser(parseInt(userId), { balance: currentBalance + workflowPrice });
    }
    throw error;
  }
});

const getMyWorkflows = asyncHandler(async (req, res) => {
  const ApiError = require('../../utils/apiError');
  
  // Use userId from authenticated user
  const userId = req.user?.id;
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const data = await registrationService.listRegistrations({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    status: req.query.status,
    search: null
  });

  // Filter by user_id
  const myRegistrations = data.data.filter(r => r.user_id === parseInt(userId));
  
  return successResponse(res, {
    data: myRegistrations,
    pagination: {
      ...data.pagination,
      total: myRegistrations.length
    }
  });
});

module.exports = { listWorkflows, getWorkflowById, registerWorkflow, getMyWorkflows };











