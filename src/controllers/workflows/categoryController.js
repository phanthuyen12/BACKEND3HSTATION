const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const categoryService = require('../../services/workflows/categoryService');

const listCategories = asyncHandler(async (req, res) => {
  const data = await categoryService.listCategories();
  return successResponse(res, data);
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return successResponse(res, { data: category }, 'Category created', 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return successResponse(res, { data: category }, 'Category updated');
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return successResponse(res, {}, 'Category deleted');
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await categoryService.getStats();
  return successResponse(res, { data: stats });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory, getStats };











