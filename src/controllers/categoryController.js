const categoryService = require('../services/categoryService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const listCategories = asyncHandler(async (_req, res) => {
  const data = await categoryService.listCategories();
  return successResponse(res, data);
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory({
    name: req.body.name,
    description: req.body.description,
    parentId: req.body.parent_id
  });
  return successResponse(res, category, 'Category created', 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, {
    name: req.body.name,
    description: req.body.description,
    parentId: req.body.parent_id
  });
  return successResponse(res, category, 'Category updated');
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return successResponse(res, {}, 'Category deleted');
});

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
};

