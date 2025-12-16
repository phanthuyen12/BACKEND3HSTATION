const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const bankService = require('../services/bankService');

const listBanks = asyncHandler(async (req, res) => {
  const data = await bankService.listBanks({
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    search: req.query.search
  });
  return successResponse(res, data);
});

const getBankById = asyncHandler(async (req, res) => {
  const data = await bankService.getBankById(req.params.id);
  return successResponse(res, { data });
});

const createBank = asyncHandler(async (req, res) => {
  const data = await bankService.createBank(req.body);
  return successResponse(res, { data }, 'Bank created', 201);
});

const updateBank = asyncHandler(async (req, res) => {
  const data = await bankService.updateBank(req.params.id, req.body);
  return successResponse(res, { data }, 'Bank updated');
});

const deleteBank = asyncHandler(async (req, res) => {
  await bankService.deleteBank(req.params.id);
  return successResponse(res, {}, 'Bank deleted');
});

module.exports = {
  listBanks,
  getBankById,
  createBank,
  updateBank,
  deleteBank
};



