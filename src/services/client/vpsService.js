const ApiError = require('../../utils/apiError');
const planModel = require('../../models/vps/planModel');
const orderModel = require('../../models/orders/orderModel');
const instanceModel = require('../../models/vps/instanceModel');
const userModel = require('../../models/userModel');

const listPlans = async () => {
  // Only get active plans
  const plans = await planModel.listPlans({ status: 'active' });
  
  const formattedPlans = plans.map(plan => ({
    id: String(plan.id),
    name: plan.name,
    price: String(plan.price),
    unit: plan.unit,
    cpu: plan.cpu,
    ram: plan.ram,
    ssd: plan.ssd,
    bandwidth: plan.bandwidth,
    discountLabel: plan.discount_label || null,
    popular: Boolean(plan.popular),
    status: plan.status,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at
  }));
  
  return {
    data: formattedPlans,
    total: formattedPlans.length
  };
};

const createOrder = async ({ userId, planId, paymentMethod = 'balance' }) => {
  // Check if plan exists and is active
  const plan = await planModel.getPlanById(planId);
  if (!plan || plan.status !== 'active') {
    throw ApiError.notFound('Plan not found');
  }

  // Get user balance
  const user = await userModel.getUserById(parseInt(userId));
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const planPrice = parseFloat(plan.price || 0);
  const isFree = planPrice === 0;

  // If plan is not free, check balance and deduct
  if (!isFree && planPrice > 0) {
    const userBalance = parseFloat(user.balance || 0);
    if (userBalance < planPrice) {
      throw ApiError.badRequest('Số dư tài khoản không đủ để mua gói VPS này');
    }

    // Deduct balance
    const newBalance = userBalance - planPrice;
    await userModel.updateUser(parseInt(userId), { balance: newBalance });
  }

  try {
    // Create order
    const order = await orderModel.createOrder({
      userId: parseInt(userId),
      type: 'vps',
      itemId: planId,
      amount: planPrice,
      paymentMethod,
      status: isFree ? 'paid' : 'paid'
    });

    // Create VPS instance with status 'pending' (waiting for admin to configure)
    const instance = await instanceModel.createInstance({
      userId: parseInt(userId),
      orderId: order.id,
      planId: planId,
      status: 'pending',
      configuration: {
        cpu: plan.cpu,
        ram: plan.ram,
        ssd: plan.ssd,
        bandwidth: plan.bandwidth
      }
    });

    return {
      order: {
        id: String(order.id),
        planId: String(order.item_id),
        amount: order.amount,
        status: order.status,
        createdAt: order.created_at
      },
      instance: {
        id: String(instance.id),
        status: instance.status,
        message: 'Đơn hàng đã được tạo. Vui lòng đợi admin cấu hình VPS.'
      }
    };
  } catch (error) {
    // Rollback: refund balance if deducted
    if (!isFree && planPrice > 0) {
      const user = await userModel.getUserById(parseInt(userId));
      const currentBalance = parseFloat(user.balance || 0);
      await userModel.updateUser(parseInt(userId), { balance: currentBalance + planPrice });
    }
    throw error;
  }
};

module.exports = {
  listPlans,
  createOrder
};

