const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const workflowService = require('../../services/workflows/workflowService');

const listWorkflows = asyncHandler(async (req, res) => {
  const data = await workflowService.listWorkflows({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    category: req.query.category
  });
  return successResponse(res, data);
});

const getWorkflowById = asyncHandler(async (req, res) => {
  const workflow = await workflowService.getWorkflowById(req.params.id);
  return successResponse(res, { data: workflow });
});

const createWorkflow = asyncHandler(async (req, res) => {
  const workflow = await workflowService.createWorkflow(req.body);
  return successResponse(res, { data: workflow }, 'Workflow created', 201);
});

const updateWorkflow = asyncHandler(async (req, res) => {
  const workflow = await workflowService.updateWorkflow(req.params.id, req.body);
  return successResponse(res, { data: workflow }, 'Workflow updated');
});

const deleteWorkflow = asyncHandler(async (req, res) => {
  await workflowService.deleteWorkflow(req.params.id);
  return successResponse(res, {}, 'Workflow deleted');
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await workflowService.getStats();
  return successResponse(res, { data: stats });
});

module.exports = { listWorkflows, getWorkflowById, createWorkflow, updateWorkflow, deleteWorkflow, getStats };











