const ApiError = require('../utils/apiError');
const userModel = require('../models/userModel');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');

const buildAuthResponse = (user) => {
  const token = signToken({ userId: user.id, role: user.role });
  return {
    token,
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

const register = async ({ name, email, password, phone }) => {
  const existing = await userModel.getUserByEmail(email);
  if (existing) {
    throw ApiError.badRequest('Email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await userModel.createUser({ name, email, passwordHash, phone });
  return buildAuthResponse(user);
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

  return buildAuthResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
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





