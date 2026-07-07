const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const webChatService = require('../services/webChatService');

const getPublicWidgetConfig = asyncHandler(async (_req, res) => {
  const config = await webChatService.getPublicConfig();
  return successResponse(res, config);
});

const getAdminWidgetConfig = asyncHandler(async (_req, res) => {
  const config = await webChatService.loadAdminConfig();
  return successResponse(res, config);
});

const getAdminHistory = asyncHandler(async (req, res) => {
  const history = await webChatService.getAdminHistory(req.query || {});
  return successResponse(res, history);
});

const getAdminHistoryStats = asyncHandler(async (_req, res) => {
  const stats = await webChatService.getAdminHistoryStats();
  return successResponse(res, stats);
});

const updateAdminWidgetConfig = asyncHandler(async (req, res) => {
  const config = await webChatService.saveAdminConfig(req.body || {});
  return successResponse(res, config, 'Đã cập nhật cấu hình AI chat thành công');
});

module.exports = {
  getPublicWidgetConfig,
  getAdminWidgetConfig,
  getAdminHistory,
  getAdminHistoryStats,
  updateAdminWidgetConfig
};
