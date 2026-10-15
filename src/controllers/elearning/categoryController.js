const categoryService = require('../../services/elearning/categoryService');
const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const listCategories = asyncHandler(async (_req, res) => {
  const data = await categoryService.listCategories();
  return successResponse(res, { data, total: data.length });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory({
    name: req.body.name
  });
  console.log('Created category:', category);
  return successResponse(res, { data: category }, 'Category created', 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, {
    name: req.body.name
  });
  return successResponse(res, { data: category }, 'Category updated');
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return successResponse(res, {}, 'Xóa danh mục thành công');
});

const getStats = asyncHandler(async (_req, res) => {
  const stats = await categoryService.getStats();
  return successResponse(res, { data: stats });
});

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getStats
};













