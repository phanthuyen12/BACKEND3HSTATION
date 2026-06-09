const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/apiError');
const userService = require('../../services/userService');

const getMe = asyncHandler(async (req, res) => {
  // req.user is already set by authenticate middleware via userService.getUserById
  // But we call it again to ensure we have the latest data including orders stats
  if (!req.user || !req.user.id) {
    throw ApiError.unauthorized('User not found in request');
  }
  const userData = await userService.getUserById(req.user.id);
  return successResponse(res, { data: userData });
});

const updateMe = asyncHandler(async (_req, res) => {
  return successResponse(res, { data: {} }, 'Profile updated');
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orderModel = require('../../models/orders/orderModel');
  const { buildPagination } = require('../../utils/pagination');
  
  const userId = req.user.id;
  const { page = 1, limit = 20, type, status } = req.query;
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  
  const orders = await orderModel.listOrders({
    userId: parseInt(userId),
    type,
    status,
    limit: take,
    offset
  });
  
  const total = await orderModel.countOrders({
    userId: parseInt(userId),
    type,
    status
  });
  
  return successResponse(res, {
    data: orders,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  });
});

const getMyCourses = asyncHandler(async (req, res) => {
  const userCourseService = require('../../services/userCourseService');
  const userId = req.user.id;
  const courses = await userCourseService.listUserCourses(parseInt(userId));
  return successResponse(res, courses);
});

const changePassword = asyncHandler(async (req, res) => {
  const userService = require('../../services/userService');
  const userId = req.user.id;
  await userService.changePassword(userId, req.body);
  return successResponse(res, {}, 'Password changed successfully');
});

const getMyDashboard = asyncHandler(async (req, res) => {
  const data = await userService.getMyDashboard(req.user.id);
  return successResponse(res, { data });
});

module.exports = { getMe, updateMe, getMyOrders, getMyCourses, changePassword, getMyDashboard };












