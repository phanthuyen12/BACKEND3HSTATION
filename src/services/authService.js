const ApiError = require('../utils/apiError');
const userModel = require('../models/userModel');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const crypto = require('crypto');

const buildAuthResponse = (user) => {
  const token = signToken({ userId: user.id, role: user.role });
  return {
    token,
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
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
  const existing = await userModel.getUserByEmail(email);
  if (existing) {
    throw ApiError.badRequest('Email already exists');
  }

  const passwordHash = await hashPassword(password);
  let refByUser = null;

  if (ref) {
    // ref có thể là ref_code hoặc email
    ref = String(ref).trim();
    if (ref) {
      console.log('[REGISTER] Looking for ref:', ref, '(type:', typeof ref, ')');
      // Ưu tiên tìm theo ref_code
      refByUser = await userModel.getUserByRefCode(ref);
      console.log('[REGISTER] getUserByRefCode result:', refByUser ? `Found user ${refByUser.id}` : 'Not found');

      if (!refByUser) {
        // fallback: nếu ref là email
        console.log('[REGISTER] Trying to find by email:', ref);
        refByUser = await userModel.getUserByEmail(ref);
        console.log('[REGISTER] getUserByEmail result:', refByUser ? `Found user ${refByUser.id}` : 'Not found');
      }

      if (refByUser) {
        console.log('[REGISTER] Found ref user:', {
          id: refByUser.id,
          email: refByUser.email,
          ref_code: refByUser.ref_code,
          ref_count: refByUser.ref_count
        });
      } else {
        console.log('[REGISTER] ❌ Ref user not found for:', ref);
        console.log('[REGISTER] This means ref_by will be NULL');
      }
    }
  }

  // Tạo user với ref_code tạm thời (sẽ update sau khi có id)
  const refByUserId = refByUser ? parseInt(refByUser.id, 10) : null;
  console.log('[REGISTER] Creating user with ref_by:', refByUserId, '(type:', typeof refByUserId, ')');

  const createdUser = await userModel.createUser({
    name,
    email,
    passwordHash,
    phone,
    refCode: null,
    refBy: refByUserId
  });

  console.log('[REGISTER] Created user:', createdUser.id, 'ref_by:', createdUser.ref_by, '(type:', typeof createdUser.ref_by, ')');

  // Generate ref_code & api_token dựa trên id user vừa tạo
  const refCode = generateRefCode(createdUser.id);
  const apiToken = generateApiToken();
  const userWithRef = await userModel.updateUser(createdUser.id, {
    refCode,
    apiToken
  });

  // Nếu có người giới thiệu, tăng ref_count của họ
  if (refByUser && refByUser.id) {
    try {
      const refByUserId = parseInt(refByUser.id, 10);
      console.log('[REGISTER] Incrementing ref_count for user:', refByUserId, 'current ref_count:', refByUser.ref_count || 0);
      // Tăng ref_count (không tăng commission vì chưa có giao dịch)
      const updatedRefUser = await userModel.incrementRefCount(refByUserId);
      console.log('[REGISTER] Successfully incremented ref_count. New ref_count:', updatedRefUser.ref_count);
    } catch (error) {
      // Log lỗi nhưng không làm fail registration
      console.error('[REGISTER] Error incrementing ref_count:', error.message, error.stack);
    }
  } else {
    console.log('[REGISTER] No refByUser, skipping ref_count increment. refByUser:', refByUser);
  }

  return buildAuthResponse(userWithRef);
};

const login = async ({ email, password }) => {
  const user = await userModel.getUserByEmail(email);
  if (!user) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  // Nếu user chưa có ref_code hoặc api_token, tạo mới
  let userWithRef = user;
  const updates = {};
  if (!user.ref_code) updates.refCode = generateRefCode(user.id);
  if (!user.api_token) updates.apiToken = generateApiToken();

  if (Object.keys(updates).length > 0) {
    userWithRef = await userModel.updateUser(user.id, updates);
  }

  return buildAuthResponse(userWithRef);
};

const logout = async (userId) => {
  // In a real implementation, you might want to blacklist the token
  // For now, just return success
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
  // In a real implementation, send password reset email
  return true;
};

const resetPassword = async (token, newPassword) => {
  // In a real implementation, verify token and reset password
  // For now, return error
  throw ApiError.badRequest('Password reset not implemented');
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





