const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const topupService = require('../../services/topups/topupService');
const topupModel = require('../../models/topups/topupModel');

const listTopups = asyncHandler(async (req, res) => {
  const data = await topupService.listTopups({
    page: req.query.page,
    limit: req.query.limit,
    userId: req.query.userId,
    status: req.query.status,
    topupStatus: req.query.topup_status,
    search: req.query.search
  });
  return successResponse(res, data);
});

const getTopupByCode = asyncHandler(async (req, res) => {
  const data = await topupService.getTopupByCode(req.params.code);
  return successResponse(res, { data });
});

const approveTopup = asyncHandler(async (req, res) => {
  const data = await topupService.approveTopup(req.params.code);
  return successResponse(res, { data }, 'Topup approved and balance added');
});

const rejectTopup = asyncHandler(async (req, res) => {
  const data = await topupService.rejectTopup(req.params.code, req.body.reason);
  return successResponse(res, { data }, 'Topup rejected');
});

const getStats = asyncHandler(async (_req, res) => {
  const allTopups = await topupModel.listTopups({ userId: null, status: null, topupStatus: null, search: null, limit: 10000, offset: 0 });
  
  const totalTopups = allTopups.length;
  const totalPending = allTopups.filter(t => t.status === 'cho-duyet').length;
  const totalApproved = allTopups.filter(t => t.status === 'da-duyet').length;
  const totalRejected = allTopups.filter(t => t.status === 'da-huy').length;
  const totalAmount = allTopups
    .filter(t => t.status === 'da-duyet')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  
  return successResponse(res, { 
    data: { 
      totalTopups, 
      totalPending, 
      totalApproved, 
      totalRejected, 
      totalAmount 
    } 
  });
});

module.exports = { listTopups, getTopupByCode, approveTopup, rejectTopup, getStats };
