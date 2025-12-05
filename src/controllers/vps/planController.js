const planService = require('../../services/vps/planService');
const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const listPlans = asyncHandler(async (req, res) => {
  const data = await planService.listPlans({
    search: req.query.search,
    popular: req.query.popular
  });
  return successResponse(res, data);
});

const createPlan = asyncHandler(async (req, res) => {
  const plan = await planService.createPlan(req.body);
  return successResponse(res, { data: plan }, 'Plan created', 201);
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await planService.updatePlan(req.params.id, req.body);
  return successResponse(res, { data: plan }, 'Plan updated');
});

const deletePlan = asyncHandler(async (req, res) => {
  await planService.deletePlan(req.params.id);
  return successResponse(res, {}, 'Plan deleted');
});

const togglePopular = asyncHandler(async (req, res) => {
  const plan = await planService.togglePopular(req.params.id, req.body.popular);
  return successResponse(res, { data: plan }, 'Plan updated');
});

const getStats = asyncHandler(async (_req, res) => {
  const stats = await planService.getStats();
  return successResponse(res, { data: stats });
});

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  togglePopular,
  getStats
};













