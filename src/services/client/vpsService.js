const ApiError = require('../../utils/apiError');
const planModel = require('../../models/vps/planModel');
const orderModel = require('../../models/orders/orderModel');
const instanceModel = require('../../models/vps/instanceModel');
const userModel = require('../../models/userModel');

// Định nghĩa các chu kỳ thanh toán và % giảm giá tương ứng
// Tham chiếu theo thiết kế: 1 tháng, 3 tháng, 6 tháng, 1 năm, 2 năm, 3 năm, 5 năm, 10 năm
const BILLING_TERMS = [
  { code: '1m', label: '1 tháng', months: 1, discountPercent: 0 },
  { code: '3m', label: '3 tháng', months: 3, discountPercent: 5 },
  { code: '6m', label: '6 tháng', months: 6, discountPercent: 10 },
  { code: '12m', label: '1 năm', months: 12, discountPercent: 20 },
  { code: '24m', label: '2 năm', months: 24, discountPercent: 25 },
  { code: '36m', label: '3 năm', months: 36, discountPercent: 30 },
  { code: '60m', label: '5 năm', months: 60, discountPercent: 30 },
  { code: '120m', label: '10 năm', months: 120, discountPercent: 30 }
];

const getBillingTerm = (code = '1m') => {
  const term = BILLING_TERMS.find((t) => t.code === code);
  if (!term) {
    throw ApiError.badRequest('Chu kỳ thanh toán không hợp lệ');
  }
  return term;
};

const listPlans = async () => {
  // Only get active plans
  const plans = await planModel.listPlans({ status: 'active' });

  const formattedPlans = plans.map((plan) => ({
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

// Tính toán bảng giá cho một gói VPS theo từng chu kỳ thanh toán
const getPlanPricing = async (planId) => {
  const plan = await planModel.getPlanById(planId);
  if (!plan || plan.status !== 'active') {
    throw ApiError.notFound('Plan not found');
  }

  const baseMonthlyPrice = parseFloat(plan.price || 0);

  const terms = BILLING_TERMS.map((term) => {
    const subtotal = baseMonthlyPrice * term.months;
    const discountAmount = (subtotal * term.discountPercent) / 100;
    const finalAmount = subtotal - discountAmount;

    return {
      code: term.code,
      label: term.label,
      months: term.months,
      discountPercent: term.discountPercent,
      baseMonthlyPrice,
      subtotal,
      discountAmount,
      finalAmount
    };
  });

  return {
    plan: {
      id: String(plan.id),
      name: plan.name,
      baseMonthlyPrice,
      unit: plan.unit
    },
    terms
  };
};

const createOrder = async ({
  userId,
  planId,
  paymentMethod = 'balance',
  billingTermCode = '1m',
  autoRenew = false
}) => {
  // Check if plan exists and is active
  const plan = await planModel.getPlanById(planId);
  if (!plan || plan.status !== 'active') {
    throw ApiError.notFound('Plan not found');
  }

  // Get user balance
  const user = await userModel.getUserById(parseInt(userId, 10));
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const baseMonthlyPrice = parseFloat(plan.price || 0);
  const term = getBillingTerm(billingTermCode);

  const subtotal = baseMonthlyPrice * term.months;
  const discountAmount = (subtotal * term.discountPercent) / 100;
  const finalAmount = subtotal - discountAmount;

  const isFree = finalAmount === 0;

  // If plan is not free, check balance and deduct
  if (!isFree && finalAmount > 0) {
    const userBalance = parseFloat(user.balance || 0);
    if (userBalance < finalAmount) {
      throw ApiError.badRequest('Số dư tài khoản không đủ để mua gói VPS này');
    }

    // Deduct balance
    const newBalance = userBalance - finalAmount;
    await userModel.updateUser(parseInt(userId, 10), { balance: newBalance });
  }

  // Tính ngày hết hạn dựa trên chu kỳ
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + term.months);
  const toMySqlDateTime = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

  const referralService = require('../referralService');

  try {
    // Create order
    const order = await orderModel.createOrder({
      userId: parseInt(userId, 10),
      type: 'vps',
      itemId: planId,
      amount: finalAmount,
      paymentMethod,
      status: isFree ? 'paid' : 'paid'
    });

    // Apply referral commission (30%) if order is paid
    if (order.status === 'paid') {
      await referralService.applyReferralCommission({
        buyerId: userId,
        orderAmount: finalAmount
      });
    }

    // Create VPS instance with status 'pending' (waiting for admin to configure)
    const instance = await instanceModel.createInstance({
      userId: parseInt(userId, 10),
      orderId: order.id,
      planId,
      status: 'pending',
      expiresAt: toMySqlDateTime(expires),
      billingTermCode: term.code,
      billingMonths: term.months,
      billingDiscountPercent: term.discountPercent,
      billingAutoRenew: Boolean(autoRenew),
      billingAmount: finalAmount,
      configuration: {
        cpu: plan.cpu,
        ram: plan.ram,
        ssd: plan.ssd,
        bandwidth: plan.bandwidth,
        billing: {
          billingTermCode: term.code,
          months: term.months,
          discountPercent: term.discountPercent,
          autoRenew: Boolean(autoRenew),
          baseMonthlyPrice,
          subtotal,
          discountAmount,
          finalAmount
        }
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
    if (!isFree && finalAmount > 0) {
      const latestUser = await userModel.getUserById(parseInt(userId, 10));
      const currentBalance = parseFloat(latestUser.balance || 0);
      await userModel.updateUser(parseInt(userId, 10), { balance: currentBalance + finalAmount });
    }
    throw error;
  }
};

module.exports = {
  listPlans,
  getPlanPricing,
  createOrder
};

