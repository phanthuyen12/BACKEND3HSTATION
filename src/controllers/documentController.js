const documentService = require('../services/documentService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const listDocuments = asyncHandler(async (req, res) => {
  const data = await documentService.listDocuments({
    page: req.query.page,
    limit: req.query.limit,
    courseId: req.query.course_id,
    categoryId: req.query.category_id,
    status: req.query.status,
    search: req.query.search
  });
  return successResponse(res, data);
});

const getDocument = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === 'undefined') {
    const ApiError = require('../utils/apiError');
    throw ApiError.badRequest('Document ID is required');
  }
  const doc = await documentService.getDocument(req.params.id);
  return successResponse(res, { data: doc });
});

const createDocument = asyncHandler(async (req, res) => {
  const doc = await documentService.createDocument({
    title: req.body.title,
    description: req.body.description,
    fileUrl: req.body.file_url || req.body.fileUrl,
    courseId: req.body.course_id || req.body.courseId,
    categoryId: req.body.category_id || req.body.categoryId,
    status: req.body.status || 'active'
  });
  return successResponse(res, { data: doc }, 'Document created', 201);
});

const updateDocument = asyncHandler(async (req, res) => {
  const doc = await documentService.updateDocument(req.params.id, {
    title: req.body.title,
    description: req.body.description,
    fileUrl: req.body.file_url || req.body.fileUrl,
    courseId: req.body.course_id || req.body.courseId,
    categoryId: req.body.category_id || req.body.categoryId,
    status: req.body.status
  });
  return successResponse(res, { data: doc }, 'Document updated');
});

const deleteDocument = asyncHandler(async (req, res) => {
  await documentService.deleteDocument(req.params.id);
  return successResponse(res, {}, 'Document deleted');
});

module.exports = {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument
};

