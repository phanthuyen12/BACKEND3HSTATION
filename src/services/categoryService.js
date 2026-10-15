const ApiError = require('../utils/apiError');
const categoryModel = require('../models/categoryModel');

const listCategories = () => categoryModel.getCategories();

const createCategory = async ({ name, description, parentId }) => {
  const existing = await categoryModel.getCategoryByName(name);
  if (existing) {
    throw ApiError.badRequest('Category name must be unique');
  }

  return categoryModel.createCategory({ name, description, parentId });
};

const updateCategory = async (id, payload) => {
  const category = await categoryModel.getCategoryById(id);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  if (payload.name && payload.name !== category.name) {
    const duplicate = await categoryModel.getCategoryByName(payload.name);
    if (duplicate && duplicate.id !== id) {
      throw ApiError.badRequest('Category name must be unique');
    }
  }

  return categoryModel.updateCategory(id, payload);
};

const deleteCategory = async (id) => {
  const category = await categoryModel.getCategoryById(id);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  await categoryModel.deleteCategory(id);
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
};

















