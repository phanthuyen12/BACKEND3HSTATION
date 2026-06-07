const authService = require('../services/authService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  console.log('Register request body:', req.body);
  const result = await authService.register(req.body);
  return successResponse(res, result, 'Register success', 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  console.log('Login result:', result);
  return successResponse(res, { data: result }, 'Login success');  
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id, req.sessionId);
  return successResponse(res, {}, 'Logout success');
});

const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  return successResponse(res, { data: result }, 'Token refreshed');
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  return successResponse(res, {}, 'Password reset email sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  return successResponse(res, {}, 'Password reset successfully');
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword
};




