const userModel = require('../models/userModel');

// Apply 30% commission to referrer when a buyer makes a successful paid order
// This will also increase ref_count (kept for simplicity; if you only want unique users, adjust logic)
const applyReferralCommission = async ({ buyerId, orderAmount }) => {
  if (!buyerId || !orderAmount || Number(orderAmount) <= 0) return;

  const buyer = await userModel.getUserById(parseInt(buyerId, 10));
  if (!buyer || !buyer.ref_by || parseInt(buyer.ref_by, 10) <= 0) return;

  const commission = Number(orderAmount) * 0.3;
  if (commission <= 0) return;

  await userModel.incrementRefCountAndCommission(buyer.ref_by, commission);
};

module.exports = { applyReferralCommission };


