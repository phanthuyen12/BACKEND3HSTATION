const ApiError = require('../utils/apiError');
const userModel = require('../models/userModel');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const crypto = require('crypto');
const mail = require('../utils/mail');
const sessionService = require('./sessionService');
const { normalizeRole } = require('../utils/roles');

const buildAuthResponse = (user, sessionId) => {
  const token = signToken({ userId: user.id, role: user.role, sessionId });
  return {
    token,
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      rank: user.rank_id ? {
        id: String(user.rank_id),
        code: user.rank_code || null,
        name: user.rank_name || null,
        description: user.rank_description || null,
        status: user.rank_status || null
      } : null,
      refCode: user.ref_code || null,
      refBy: user.ref_by || null,
      refCount: user.ref_count || 0,
      refCommission: user.ref_commission || 0,
      apiToken: user.api_token || null
    }
  };
};

const generateApiToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateRefCode = (userId) => {
  // Simple ref code: "REF" + userId + random 4 chars
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REF${userId}${random}`;
};

const register = async ({ name, email, password, phone, ref }) => {
  throw ApiError.forbidden('Self-registration is disabled. Accounts are created by admin.');
};

const login = async ({ email, password }) => {
  const user = await userModel.getUserByEmailWithPassword(email);
  if (!user) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  if (user.status !== 'active') {
    throw ApiError.forbidden('Account is locked');
  }

  // Nếu user chưa có ref_code hoặc api_token, tạo mới
  let userWithRef = user;
  const updates = {};
  if (!user.ref_code) updates.refCode = generateRefCode(user.id);
  if (!user.api_token) updates.apiToken = generateApiToken();

  if (Object.keys(updates).length > 0) {
    userWithRef = await userModel.updateUser(user.id, updates);
  } else {
    userWithRef = await userModel.getUserById(user.id);
  }

  const sessionId = sessionService.createSession(userWithRef.id);
  return buildAuthResponse(userWithRef, sessionId);
};

const logout = async (userId, sessionId) => {
  sessionService.clearSession(userId, sessionId);
  return true;
};

const refreshToken = async (refreshToken) => {
  // In a real implementation, verify refresh token and issue new access token
  // For now, return error
  throw ApiError.badRequest('Refresh token not implemented');
};

const forgotPassword = async (email) => {
  const user = await userModel.getUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists for security
    return true;
  }

  // Generate reset token
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 hour from now

  // Save token to database
  await userModel.updateUser(user.id, {
    resetPasswordToken: token,
    resetPasswordExpires: expires
  });

  // Send email
  await mail.sendResetPasswordEmail(user.email, token);

  return true;
};

const resetPassword = async (token, newPassword) => {
  const user = await userModel.getUserByResetToken(token);
  if (!user) {
    throw ApiError.badRequest('Liên kết khôi phục mật khẩu không hợp lệ hoặc đã hết hạn');
  }

  const passwordHash = await hashPassword(newPassword);

  // Update password and clear reset token
  await userModel.updateUser(user.id, {
    passwordHash,
    resetPasswordToken: null,
    resetPasswordExpires: null
  });

  return true;
};

const getProfile = (userId) => userModel.getUserById(userId);

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getProfile
};
