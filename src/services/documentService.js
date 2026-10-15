const ApiError = require('../utils/apiError');
const documentModel = require('../models/documentModel');
const { buildPagination } = require('../utils/pagination');

const listDocuments = async ({ page, limit, courseId, categoryId, status, search }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  
  const documents = await documentModel.listDocuments({
    courseId: courseId ? parseInt(courseId) : null,
    categoryId: categoryId ? parseInt(categoryId) : null,
    status,
    search,
    limit: take,
    offset
  });
  
  const total = await documentModel.countDocuments({
    courseId: courseId ? parseInt(courseId) : null,
    categoryId: categoryId ? parseInt(categoryId) : null,
    status,
    search
  });
  
  const formattedDocs = documents.map(doc => ({
    id: String(doc.id),
    title: doc.title,
    description: doc.description || '',
    fileUrl: doc.file_url,
    courseId: doc.course_id ? String(doc.course_id) : null,
    categoryId: doc.category_id ? String(doc.category_id) : null,
    categoryName: doc.category_name || null,
    status: doc.status || 'active',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at
  }));
  
  return {
    data: formattedDocs,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getDocument = async (id) => {
  const doc = await documentModel.getDocumentById(parseInt(id));
  if (!doc) {
    throw ApiError.notFound('Document not found');
  }
  
  return {
    id: String(doc.id),
    title: doc.title,
    description: doc.description || '',
    fileUrl: doc.file_url,
    courseId: doc.course_id ? String(doc.course_id) : null,
    categoryId: doc.category_id ? String(doc.category_id) : null,
    categoryName: doc.category_name || null,
    status: doc.status || 'active',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at
  };
};

const createDocument = (payload) => {
  // Convert undefined to null for MySQL compatibility
  const courseId = payload.courseId || payload.course_id;
  const categoryId = payload.categoryId || payload.category_id;
  
  return documentModel.createDocument({
    title: payload.title,
    description: payload.description || null,
    fileUrl: payload.fileUrl || payload.file_url,
    courseId: courseId !== undefined ? courseId : null,
    categoryId: categoryId !== undefined ? categoryId : null,
    status: payload.status || 'active'
  });
};

const updateDocument = async (id, payload) => {
  const doc = await documentModel.getDocumentById(parseInt(id));
  if (!doc) {
    throw ApiError.notFound('Document not found');
  }
  
  return documentModel.updateDocument(parseInt(id), {
    title: payload.title,
    description: payload.description,
    fileUrl: payload.fileUrl || payload.file_url,
    courseId: payload.courseId || payload.course_id,
    categoryId: payload.categoryId || payload.category_id,
    status: payload.status
  });
};

const deleteDocument = async (id) => {
  const doc = await documentModel.getDocumentById(parseInt(id));
  if (!doc) {
    throw ApiError.notFound('Document not found');
  }
  await documentModel.deleteDocument(parseInt(id));
};

module.exports = {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument
};

















