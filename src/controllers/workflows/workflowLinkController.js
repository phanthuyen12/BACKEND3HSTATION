const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/apiError');
const workflowLinkModel = require('../../models/workflows/workflowLinkModel');
const workflowModel = require('../../models/workflows/workflowModel');

// GET /api/workflows/:workflowId/links - Lấy danh sách links của workflow
const getWorkflowLinks = asyncHandler(async (req, res) => {
  const { workflowId } = req.params;
  const { status } = req.query;
  
  // Kiểm tra workflow tồn tại
  const workflow = await workflowModel.getWorkflowById(workflowId);
  if (!workflow) {
    throw ApiError.notFound('Workflow not found');
  }
  
  const links = await workflowLinkModel.listLinksByWorkflow(workflowId, { status });
  
  return successResponse(res, { data: links });
});

// POST /api/workflows/:workflowId/links/bulk - Thêm links hàng loạt
const addWorkflowLinksBulk = asyncHandler(async (req, res) => {
  const { workflowId } = req.params;
  const { links } = req.body;
  
  if (!links || !Array.isArray(links) || links.length === 0) {
    throw ApiError.badRequest('Links array is required and must not be empty');
  }
  
  // Kiểm tra workflow tồn tại
  const workflow = await workflowModel.getWorkflowById(workflowId);
  if (!workflow) {
    throw ApiError.notFound('Workflow not found');
  }
  
  // Lọc bỏ các link rỗng
  const validLinks = links
    .map(link => typeof link === 'string' ? link.trim() : '')
    .filter(link => link.length > 0);
  
  if (validLinks.length === 0) {
    throw ApiError.badRequest('No valid links provided');
  }
  
  const createdLinks = await workflowLinkModel.createLinksBulk({
    workflowId: parseInt(workflowId),
    links: validLinks
  });
  
  return successResponse(res, { 
    data: createdLinks,
    message: `Đã thêm ${createdLinks.length} links thành công`
  }, 'Links added successfully', 201);
});

// POST /api/workflows/:workflowId/links - Thêm 1 link
const addWorkflowLink = asyncHandler(async (req, res) => {
  const { workflowId } = req.params;
  const { downloadLink } = req.body;
  
  if (!downloadLink || typeof downloadLink !== 'string' || downloadLink.trim().length === 0) {
    throw ApiError.badRequest('downloadLink is required');
  }
  
  // Kiểm tra workflow tồn tại
  const workflow = await workflowModel.getWorkflowById(workflowId);
  if (!workflow) {
    throw ApiError.notFound('Workflow not found');
  }
  
  const link = await workflowLinkModel.createLink({
    workflowId: parseInt(workflowId),
    downloadLink: downloadLink.trim()
  });
  
  return successResponse(res, { data: link }, 'Link added successfully', 201);
});

// PUT /api/workflows/links/:linkId - Cập nhật link
const updateWorkflowLink = asyncHandler(async (req, res) => {
  const { linkId } = req.params;
  const { downloadLink, status } = req.body;
  
  const link = await workflowLinkModel.getLinkById(linkId);
  if (!link) {
    throw ApiError.notFound('Link not found');
  }
  
  const updatedLink = await workflowLinkModel.updateLink(linkId, {
    downloadLink: downloadLink?.trim(),
    status
  });
  
  return successResponse(res, { data: updatedLink }, 'Link updated successfully');
});

// DELETE /api/workflows/links/:linkId - Xóa link
const deleteWorkflowLink = asyncHandler(async (req, res) => {
  const { linkId } = req.params;
  
  const link = await workflowLinkModel.getLinkById(linkId);
  if (!link) {
    throw ApiError.notFound('Link not found');
  }
  
  // Không cho phép xóa link đã bán
  if (link.status === 'da-ban') {
    throw ApiError.badRequest('Cannot delete a sold link');
  }
  
  await workflowLinkModel.deleteLink(linkId);
  
  return successResponse(res, {}, 'Link deleted successfully');
});

module.exports = {
  getWorkflowLinks,
  addWorkflowLink,
  addWorkflowLinksBulk,
  updateWorkflowLink,
  deleteWorkflowLink
};


