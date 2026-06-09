const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const topupService = require('../../services/topups/topupService');
const bankModel = require('../../models/bankModel');

const disabledResponse = () => {
  const ApiError = require('../../utils/apiError');
  throw ApiError.forbidden('Nạp tiền đã bị vô hiệu hóa. Quyền học tập được cấp theo rank.');
};

const createTopup = asyncHandler(async (req, res) => {
  disabledResponse();
});

const uploadProof = asyncHandler(async (req, res) => {
  disabledResponse();
});

const getHistory = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    const ApiError = require('../../utils/apiError');
    throw ApiError.unauthorized('User not authenticated');
  }

  const data = await topupService.listTopups({
    page: req.query.page,
    limit: req.query.limit,
    userId: String(userId),
    topupStatus: req.query.status || req.query.topup_status // Filter by topup_status
  });
  return successResponse(res, data);
});

const getBanks = asyncHandler(async (_req, res) => {
  const banks = await bankModel.listBanks({ status: 'active' });
  const formattedBanks = banks.map(bank => ({
    id: String(bank.id),
    name: bank.name,
    accountNumber: bank.account_number,
    accountName: bank.account_name,
    branch: bank.branch || null
  }));
  return successResponse(res, { data: formattedBanks });
});

const getTopupByCode = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    const ApiError = require('../../utils/apiError');
    throw ApiError.unauthorized('User not authenticated');
  }

  const data = await topupService.getTopupByCode(req.params.code);
  
  // Kiểm tra xem topup có thuộc về user này không
  if (String(data.userId) !== String(userId)) {
    const ApiError = require('../../utils/apiError');
    throw ApiError.forbidden('You do not have permission to view this topup');
  }
  
  return successResponse(res, { data });
});

module.exports = { createTopup, uploadProof, getHistory, getBanks, getTopupByCode };












