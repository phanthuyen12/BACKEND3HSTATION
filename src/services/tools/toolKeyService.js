const ApiError = require('../../utils/apiError');
const { query } = require('../../config/database');
const toolPackageModel = require('../../models/tools/toolPackageModel');
const toolKeyModel = require('../../models/tools/toolKeyModel');
const userModel = require('../../models/userModel');
const orderModel = require('../../models/orders/orderModel');
const referralService = require('../referralService');
const crypto = require('crypto');

const generateKey = () => {
  return `KEY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
};

const toMySqlDateTime = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

const buyToolPackage = async ({ userId, packageId, priceId, paymentMethod = 'balance' }) => {
  const pkg = await toolPackageModel.getToolPackageById(packageId);
  if (!pkg || pkg.status !== 'active') {
    throw ApiError.notFound('Tool package not found or inactive');
  }

  // Fetch the specific pricing option
  const pricing = await toolPackageModel.getPriceById(priceId);
  if (!pricing || pricing.package_id !== parseInt(packageId)) {
    throw ApiError.badRequest('Lựa chọn thời gian không hợp lệ');
  }

  const user = await userModel.getUserById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const finalAmount = parseFloat(pricing.price);
  const userBalance = parseFloat(user.balance || 0);

  if (userBalance < finalAmount) {
    throw ApiError.badRequest('Số dư tài khoản không đủ');
  }

  // Deduct balance
  await userModel.updateUser(userId, { balance: userBalance - finalAmount });

  try {
    // Create order
    const order = await orderModel.createOrder({
      userId,
      type: 'tool_key',
      itemId: packageId,
      amount: finalAmount,
      paymentMethod,
      status: 'paid'
    });

    // Apply referral commission
    await referralService.applyReferralCommission({
      buyerId: userId,
      orderAmount: finalAmount
    });

    // Create Tool Key
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + pricing.duration_days);

    const toolKey = await toolKeyModel.createToolKey({
      user_id: userId,
      package_id: packageId,
      key_token: generateKey(),
      expires_at: toMySqlDateTime(expiresAt),
      status: 'active'
    });

    return {
      order,
      toolKey
    };
  } catch (error) {
    // Rollback balance
    await userModel.updateUser(userId, { balance: userBalance });
    throw error;
  }
};

const renewToolKey = async ({ userId, keyId, priceId }) => {
  console.log(`[RenewKey] Processing: userId=${userId}, keyId=${keyId}, priceId=${priceId}`);
  
  const toolKey = await toolKeyModel.getToolKeyById(keyId);
  if (!toolKey) {
    console.error(`[RenewKey] Key not found: ${keyId}`);
    throw ApiError.notFound('Tool key not found');
  }

  // Debug: Nếu userId không khớp, log ra để kiểm tra
  if (parseInt(toolKey.user_id) !== parseInt(userId)) {
    console.error(`[RenewKey] Ownership mismatch: Key Owner=${toolKey.user_id}, Requester=${userId}`);
    throw ApiError.notFound('Tool key không thuộc quyền sở hữu của bạn');
  }

  // Fetch the specific pricing option chosen for renewal
  const pricing = await toolPackageModel.getPriceById(priceId);
  if (!pricing || pricing.package_id !== toolKey.package_id) {
    throw ApiError.badRequest('Lựa chọn thời gian gia hạn không hợp lệ');
  }

  const user = await userModel.getUserById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const finalAmount = parseFloat(pricing.price);
  const userBalance = parseFloat(user.balance || 0);

  if (userBalance < finalAmount) {
    throw ApiError.badRequest('Số dư tài khoản không đủ để gia hạn gói này');
  }

  // Deduct balance
  await userModel.updateUser(userId, { balance: userBalance - finalAmount });

  try {
    // Create renewal order
    await orderModel.createOrder({
      userId,
      type: 'tool_key_renewal',
      itemId: keyId,
      amount: finalAmount,
      paymentMethod: 'balance',
      status: 'paid'
    });

    // Apply referral commission
    await referralService.applyReferralCommission({
      buyerId: userId,
      orderAmount: finalAmount
    });

    // Update expiry: Calc from current expiry or now
    const currentExpiry = new Date(toolKey.expires_at);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + pricing.duration_days);

    const updatedKey = await toolKeyModel.renewToolKey(keyId, toMySqlDateTime(newExpiresAt));

    return updatedKey;
  } catch (error) {
    // Rollback balance
    await userModel.updateUser(userId, { balance: userBalance });
    throw error;
  }
};

const activateKey = async ({ keyToken, machineId, machineInfo }) => {
  const toolKey = await toolKeyModel.getToolKeyByToken(keyToken);
  if (!toolKey) {
    throw ApiError.notFound('Key không hợp lệ');
  }

  if (toolKey.status !== 'active') {
    throw ApiError.badRequest(`Key đang ở trạng thái: ${toolKey.status}`);
  }

  if (new Date(toolKey.expires_at) < new Date()) {
    await toolKeyModel.updateToolKeyStatus(toolKey.id, 'expired');
    throw ApiError.badRequest('Key đã hết hạn');
  }

  // If already activated on another machine
  if (toolKey.machine_id && toolKey.machine_id !== machineId) {
    throw ApiError.badRequest('Key đã được kích hoạt trên máy tính khác');
  }

  return await toolKeyModel.activateToolKey(toolKey.id, { machine_id: machineId, machine_info: machineInfo });
};

const checkKeyStatus = async ({ keyToken, machineId }) => {
  const toolKey = await toolKeyModel.getToolKeyByToken(keyToken);
  if (!toolKey) {
    return { valid: false, message: 'Key không tồn tại' };
  }

  if (toolKey.status !== 'active') {
    return { valid: false, message: `Key đang bị ${toolKey.status}`, status: toolKey.status };
  }

  if (new Date(toolKey.expires_at) < new Date()) {
    await toolKeyModel.updateToolKeyStatus(toolKey.id, 'expired');
    return { valid: false, message: 'Key đã hết hạn', status: 'expired' };
  }

  if (toolKey.machine_id && toolKey.machine_id !== machineId) {
    return { valid: false, message: 'Key đã kích hoạt cho máy khác', status: 'wrong_machine' };
  }

  return {
    valid: true,
    status: toolKey.status,
    expires_at: toolKey.expires_at,
    activated: !!toolKey.activated_at,
    toolKey
  };
};

const checkMachineStatus = async (machineId) => {
  const sql = `
    SELECT tk.*, tp.name AS package_name
    FROM tool_keys tk
    JOIN tool_packages tp ON tk.package_id = tp.id
    WHERE tk.machine_id = ? AND tk.status = 'active' AND tk.expires_at > NOW()
    LIMIT 1
  `;
  const [row] = await query(sql, [machineId]);
  if (!row) {
    return { activated: false };
  }
  return { activated: true, toolKey: row };
};

module.exports = {
  buyToolPackage,
  renewToolKey,
  activateKey,
  checkKeyStatus,
  checkMachineStatus
};
