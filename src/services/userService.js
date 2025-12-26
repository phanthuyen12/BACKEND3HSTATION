const ApiError = require('../utils/apiError');
const userModel = require('../models/userModel');
const { hashPassword, comparePassword } = require('../utils/password');
const { buildPagination } = require('../utils/pagination');

const listUsers = async ({ search, status, page, limit }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  
  const users = await userModel.listUsers({
    search,
    status,
    limit: take,
    offset
  });
  
  const total = await userModel.countUsers({ search, status });
  
  const formattedUsers = users.map(user => ({
    id: String(user.id),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    balance: parseFloat(user.balance || 0),
    status: user.status || 'active',
    refCode: user.ref_code || null,
    refBy: user.ref_by || null,
    refCount: user.ref_count || 0,
    refCommission: parseFloat(user.ref_commission || 0),
    joinedAt: user.created_at,
    lastLoginAt: user.last_login_at || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }));
  
  return {
    data: formattedUsers,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getUserById = async (id) => {
  let user = await userModel.getUserById(parseInt(id));
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Nếu user chưa có ref_code, tạo mới
  if (!user.ref_code) {
    const generateRefCode = (userId) => {
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `REF${userId}${random}`;
    };
    const refCode = generateRefCode(user.id);
    user = await userModel.updateUser(parseInt(id), { refCode });
  }
  
  // Get user orders stats
  const orders = await userModel.getUserOrdersStats(parseInt(id));
  
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    balance: parseFloat(user.balance || 0),
    status: user.status || 'active',
    avatar: user.avatar_url || '',
    address: user.address || '',
    refCode: user.ref_code || null,
    refBy: user.ref_by || null,
    refCount: user.ref_count || 0,
    refCommission: parseFloat(user.ref_commission || 0),
    joinedAt: user.created_at,
    lastLoginAt: user.last_login_at || null,
    orders: {
      total: orders.total || 0,
      courses: orders.courses || 0,
      workflows: orders.workflows || 0,
      vps: orders.vps || 0
    },
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
};

const createUser = async ({ name, email, phone, password, status }) => {
  const existing = await userModel.getUserByEmail(email);
  if (existing) {
    throw ApiError.badRequest('Email already exists');
  }
  
  const passwordHash = await hashPassword(password);
  const user = await userModel.createUser({
    name,
    email,
    phone,
    passwordHash,
    status: status || 'active'
  });
  
  return formatUserResponse(user);
};

const updateUser = async (id, payload) => {
  const user = await userModel.getUserById(parseInt(id));
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  if (payload.email && payload.email !== user.email) {
    const existing = await userModel.getUserByEmail(payload.email);
    if (existing) {
      throw ApiError.badRequest('Email already exists');
    }
  }
  
  const updated = await userModel.updateUser(parseInt(id), {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    status: payload.status,
    balance: payload.balance
  });
  
  return formatUserResponse(updated);
};

const toggleLock = async (id, status) => {
  const user = await userModel.getUserById(parseInt(id));
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  const updated = await userModel.updateUser(parseInt(id), { status });
  return formatUserResponse(updated);
};

const deleteUser = async (id) => {
  const user = await userModel.getUserById(parseInt(id));
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  await userModel.deleteUser(parseInt(id));
};

const updateBalance = async (id, { amount, type, note }) => {
  const user = await userModel.getUserById(parseInt(id));
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  let newBalance = parseFloat(user.balance || 0);
  
  if (type === 'add') {
    newBalance += amount;
  } else if (type === 'subtract') {
    newBalance -= amount;
    if (newBalance < 0) {
      throw ApiError.badRequest('Insufficient balance');
    }
  } else if (type === 'set') {
    newBalance = amount;
  }
  
  const updated = await userModel.updateUser(parseInt(id), { balance: newBalance });
  
  // In a real implementation, you would log this transaction
  return {
    id: String(updated.id),
    balance: newBalance,
    updatedAt: updated.updated_at
  };
};

const getStats = async () => {
  const stats = await userModel.getUserStats();
  return {
    totalUsers: stats.total || 0,
    totalActive: stats.active || 0,
    totalLocked: stats.locked || 0
  };
};

const formatUserResponse = (user) => {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    balance: parseFloat(user.balance || 0),
    status: user.status || 'active',
    joinedAt: user.created_at,
    lastLoginAt: user.last_login_at || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
};

const getUserByEmail = (email) => userModel.getUserByEmail(email);

const changePassword = async (userId, { currentPassword, newPassword }) => {
  // Lấy user với password hash
  const user = await userModel.getUserByIdWithPassword(parseInt(userId));
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Kiểm tra mật khẩu hiện tại
  const isMatch = await comparePassword(currentPassword, user.password_hash);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  // Hash mật khẩu mới
  const newPasswordHash = await hashPassword(newPassword);

  // Cập nhật mật khẩu
  await userModel.updateUser(parseInt(userId), {
    passwordHash: newPasswordHash
  });

  return true;
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleLock,
  deleteUser,
  updateBalance,
  getStats,
  getUserByEmail,
  changePassword
};

