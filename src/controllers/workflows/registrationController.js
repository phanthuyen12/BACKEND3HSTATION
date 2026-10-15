const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const registrationService = require('../../services/workflows/registrationService');

const listRegistrations = asyncHandler(async (req, res) => {
  const data = await registrationService.listRegistrations({
    page: req.query.page,
    limit: req.query.limit,
    workflowId: req.query.workflowId,
    status: req.query.status,
    search: req.query.search
  });
  return successResponse(res, data);
});

const approveRegistration = asyncHandler(async (req, res) => {
  const registration = await registrationService.approveRegistration(req.params.id);
  return successResponse(res, { data: registration }, 'Registration approved');
});

const rejectRegistration = asyncHandler(async (req, res) => {
  const registration = await registrationService.rejectRegistration(req.params.id, req.body);
  return successResponse(res, { data: registration }, 'Registration rejected');
});

const deleteRegistration = asyncHandler(async (req, res) => {
  await registrationService.deleteRegistration(req.params.id);
  return successResponse(res, {}, 'Registration deleted');
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await registrationService.getStats();
  return successResponse(res, { data: stats });
});

module.exports = { listRegistrations, approveRegistration, rejectRegistration, deleteRegistration, getStats };











