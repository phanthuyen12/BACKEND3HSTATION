const userModel = require('../models/userModel');
const configModel = require('../models/configModel');

// Apply commission to referrer when a buyer makes a successful paid order
// Commission rate is fetched from system_configs (commission_rate)
const applyReferralCommission = async ({ buyerId, orderAmount }) => {
  if (!buyerId || !orderAmount || Number(orderAmount) <= 0) return;

  const buyer = await userModel.getUserById(parseInt(buyerId, 10));
  if (!buyer || !buyer.ref_by || parseInt(buyer.ref_by, 10) <= 0) return;

  const configs = await configModel.getAllConfigs();
  const rateConfig = configs.commission_rate || '0';
  const commissionRate = parseFloat(rateConfig) / 100; // e.g., "10" -> 0.1

  if (commissionRate <= 0) return;

  const commission = Number(orderAmount) * commissionRate;
  if (commission <= 0) return;

  await userModel.incrementRefCountAndCommission(buyer.ref_by, commission);
};

module.exports = { applyReferralCommission };


