const ApiError = require('../../utils/apiError');
const categoryModel = require('../../models/workflows/categoryModel');

const listCategories = async () => {
  const categories = await categoryModel.listCategories();
  return { data: categories, total: categories.length };
};

const createCategory = async ({ name }) => {
  // Check if category name already exists
  const existing = await categoryModel.getCategoryByName(name);
  if (existing) {
    throw ApiError.badRequest('Category name already exists');
  }

  const category = await categoryModel.createCategory({ name });
  return category;
};

const updateCategory = async (id, { name }) => {
  const existing = await categoryModel.getCategoryById(id);
  if (!existing) {
    throw ApiError.notFound('Category not found');
  }

  // Check if new name conflicts with another category
  const nameExists = await categoryModel.getCategoryByName(name);
  if (nameExists && nameExists.id !== parseInt(id)) {
    throw ApiError.badRequest('Category name already exists');
  }

  const category = await categoryModel.updateCategory(id, { name });
  return category;
};

const deleteCategory = async (id) => {
  const existing = await categoryModel.getCategoryById(id);
  if (!existing) {
    throw ApiError.notFound('Category not found');
  }

  await categoryModel.deleteCategory(id);
};

const getStats = async () => {
  const totalCategories = await categoryModel.countCategories();
  const workflowCounts = await categoryModel.countWorkflowsByCategory();
  
  const totalWorkflows = workflowCounts.reduce((sum, item) => sum + (item.workflow_count || 0), 0);
  const avgPerCategory = totalCategories > 0 ? (totalWorkflows / totalCategories).toFixed(2) : 0;

  return {
    totalWorkflows,
    totalCategories,
    avgPerCategory: parseFloat(avgPerCategory)
  };
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getStats
};



