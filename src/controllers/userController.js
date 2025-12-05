const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');

const listUsers = asyncHandler(async (req, res) => {
  const data = await userService.listUsers({
    search: req.query.search,
    status: req.query.status,
    page: req.query.page,
    limit: req.query.limit
  });
  return successResponse(res, data);
});

const getUserById = asyncHandler(async (req, res) => {
  const data = await userService.getUserById(req.params.id);
  return successResponse(res, { data });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  return successResponse(res, { data: user }, 'User created', 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  return successResponse(res, { data: user }, 'User updated');
});

const toggleLock = asyncHandler(async (req, res) => {
  const user = await userService.toggleLock(req.params.id, req.body.status);
  return successResponse(res, { data: user }, 'User status updated');
});

const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);
  return successResponse(res, {}, 'User deleted');
});

const updateBalance = asyncHandler(async (req, res) => {
  const result = await userService.updateBalance(req.params.id, {
    amount: req.body.amount,
    type: req.body.type,
    note: req.body.note
  });
  return successResponse(res, { data: result }, 'Balance updated');
});

const getStats = asyncHandler(async (_req, res) => {
  const stats = await userService.getStats();
  return successResponse(res, { data: stats });
});

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleLock,
  deleteUser,
  updateBalance,
  getStats
};





