const documentService = require('../../services/documentService');
const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const listDocuments = asyncHandler(async (req, res) => {
  // Client chỉ xem được documents có status = 'active'
  // Note: If status column doesn't exist, all documents will be returned
  const data = await documentService.listDocuments({
    page: req.query.page,
    limit: req.query.limit,
    categoryId: req.query.category_id,
    status: 'active', // Chỉ lấy documents active (will be ignored if column doesn't exist)
    search: req.query.search
  });
  return successResponse(res, data);
});

const getDocument = asyncHandler(async (req, res) => {
  const doc = await documentService.getDocument(req.params.id);
  
  // Kiểm tra nếu document không active thì không cho client xem
  // Note: If status column doesn't exist, status will default to 'active'
  if (doc.status && doc.status !== 'active') {
    const ApiError = require('../../utils/apiError');
    throw ApiError.notFound('Document not found');
  }
  
  return successResponse(res, { data: doc });
});

module.exports = {
  listDocuments,
  getDocument
};

