const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const instanceService = require('../../services/vps/instanceService');

const listInstances = asyncHandler(async (req, res) => {
  const data = await instanceService.listInstances({
    page: req.query.page,
    limit: req.query.limit,
    userId: req.query.userId,
    status: req.query.status,
    search: req.query.search
  });
  return successResponse(res, data);
});

const getInstanceById = asyncHandler(async (req, res) => {
  const data = await instanceService.getInstanceById(req.params.id);
  return successResponse(res, { data });
});

const updateInstance = asyncHandler(async (req, res) => {
  const data = await instanceService.updateInstance(req.params.id, req.body);
  return successResponse(res, { data }, 'VPS instance updated');
});

const deleteInstance = asyncHandler(async (req, res) => {
  await instanceService.deleteInstance(req.params.id);
  return successResponse(res, {}, 'VPS instance deleted');
});

module.exports = {
  listInstances,
  getInstanceById,
  updateInstance,
  deleteInstance
};



