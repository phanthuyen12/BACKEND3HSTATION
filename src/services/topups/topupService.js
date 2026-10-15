const ApiError = require('../../utils/apiError');
const topupModel = require('../../models/topups/topupModel');
const userModel = require('../../models/userModel');
const { buildPagination } = require('../../utils/pagination');

// Generate random 10 character code
const generateTopupCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const listTopups = async ({ page, limit, userId, status, topupStatus, search }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  
  const topups = await topupModel.listTopups({
    userId: userId ? parseInt(userId) : null,
    status,
    topupStatus,
    search,
    limit: take,
    offset
  });
  
  const total = await topupModel.countTopups({
    userId: userId ? parseInt(userId) : null,
    status,
    topupStatus,
    search
  });
  
  const formattedTopups = topups.map(topup => ({
    code: topup.code,
    userId: String(topup.user_id),
    amount: parseFloat(topup.amount || 0),
    bank: topup.bank,
    accountNumber: topup.account_number,
    accountName: topup.account_name,
    topupStatus: topup.topup_status,
    status: topup.status,
    paymentProof: topup.payment_proof,
    note: topup.note,
    reason: topup.reason,
    expiresAt: topup.expires_at,
    userName: topup.user_name,
    userEmail: topup.user_email,
    createdAt: topup.created_at,
    updatedAt: topup.updated_at
  }));
  
  return {
    data: formattedTopups,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getTopupByCode = async (code) => {
  const topup = await topupModel.getTopupByCode(code);
  if (!topup) {
    throw ApiError.notFound('Topup not found');
  }
  
  return {
    code: topup.code,
    userId: String(topup.user_id),
    amount: parseFloat(topup.amount || 0),
    bank: topup.bank,
    accountNumber: topup.account_number,
    accountName: topup.account_name,
    topupStatus: topup.topup_status,
    status: topup.status,
    paymentProof: topup.payment_proof,
    note: topup.note,
    reason: topup.reason,
    expiresAt: topup.expires_at,
    userName: topup.user_name,
    userEmail: topup.user_email,
    createdAt: topup.created_at,
    updatedAt: topup.updated_at
  };
};

const createTopup = async ({ userId, amount, bankId }) => {
  // Get bank info
  const bankModel = require('../../models/bankModel');
  const bank = await bankModel.getBankById(parseInt(bankId));
  if (!bank || bank.status !== 'active') {
    throw ApiError.notFound('Bank not found or inactive');
  }

  // Generate unique code
  let code;
  let exists = true;
  while (exists) {
    code = generateTopupCode();
    const existing = await topupModel.getTopupByCode(code);
    if (!existing) {
      exists = false;
    }
  }

  // Set expires_at to 15 minutes from now (for countdown demo, we use 60 seconds)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  const topup = await topupModel.createTopup({
    code,
    userId: parseInt(userId),
    amount: parseFloat(amount),
    bank: bank.name,
    accountNumber: bank.account_number,
    accountName: bank.account_name,
    expiresAt
  });

  return {
    code: topup.code,
    amount: parseFloat(topup.amount || 0),
    bank: topup.bank,
    accountNumber: topup.account_number,
    accountName: topup.account_name,
    expiresAt: topup.expires_at,
    createdAt: topup.created_at
  };
};

const approveTopup = async (code) => {
  const topup = await topupModel.getTopupByCode(code);
  if (!topup) {
    throw ApiError.notFound('Topup not found');
  }

  if (topup.status === 'da-duyet') {
    throw ApiError.badRequest('Topup already approved');
  }

  if (topup.status === 'da-huy') {
    throw ApiError.badRequest('Cannot approve a rejected topup');
  }

  // Update topup status
  await topupModel.updateTopup(code, {
    status: 'da-duyet',
    topupStatus: 'da-thanh-cong'
  });

  // Add balance to user
  const user = await userModel.getUserById(topup.user_id);
  if (user) {
    const currentBalance = parseFloat(user.balance || 0);
    const newBalance = currentBalance + parseFloat(topup.amount || 0);
    await userModel.updateUser(topup.user_id, { balance: newBalance });
  }

  return {
    code: topup.code,
    status: 'da-duyet',
    userBalance: parseFloat(user?.balance || 0) + parseFloat(topup.amount || 0)
  };
};

const rejectTopup = async (code, reason) => {
  const topup = await topupModel.getTopupByCode(code);
  if (!topup) {
    throw ApiError.notFound('Topup not found');
  }

  if (topup.status === 'da-huy') {
    throw ApiError.badRequest('Topup already rejected');
  }

  await topupModel.updateTopup(code, {
    status: 'da-huy',
    reason: reason || null
  });

  return {
    code: topup.code,
    status: 'da-huy'
  };
};

const uploadProof = async (code, paymentProof) => {
  const topup = await topupModel.getTopupByCode(code);
  if (!topup) {
    throw ApiError.notFound('Topup not found');
  }

  await topupModel.updateTopup(code, {
    paymentProof
  });

  return getTopupByCode(code);
};

module.exports = {
  listTopups,
  getTopupByCode,
  createTopup,
  approveTopup,
  rejectTopup,
  uploadProof
};

