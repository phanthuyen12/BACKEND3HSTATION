const ApiError = require('../../utils/apiError');
const categoryModel = require('../../models/categoryModel');
const courseModel = require('../../models/courseModel');

const listCategories = async () => {
  const categories = await categoryModel.getCategories();
  
  // Get course count for each category
  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const courseCount = await courseModel.countCourses({ categoryId: cat.id });
      return {
        id: String(cat.id),
        name: cat.name,
        courseCount: courseCount || 0,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at
      };
    })
  );
  
  return categoriesWithCount;
};

const createCategory = async ({ name }) => {
  const existing = await categoryModel.getCategoryByName(name);
  if (existing) {
    throw ApiError.badRequest('Category name must be unique');
  }

  const category = await categoryModel.createCategory({ name });
  return {
    id: String(category.id),
    name: category.name,
    courseCount: 0,
    createdAt: category.created_at,
    updatedAt: category.updated_at
  };
};

const updateCategory = async (id, payload) => {
  const category = await categoryModel.getCategoryById(parseInt(id));
  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  if (payload.name && payload.name !== category.name) {
    const duplicate = await categoryModel.getCategoryByName(payload.name);
    if (duplicate && duplicate.id !== parseInt(id)) {
      throw ApiError.badRequest('Category name must be unique');
    }
  }

  const updated = await categoryModel.updateCategory(parseInt(id), payload);
  const courseCount = await courseModel.countCourses({ categoryId: parseInt(id) });
  
  return {
    id: String(updated.id),
    name: updated.name,
    courseCount: courseCount || 0,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at
  };
};

const deleteCategory = async (id) => {
  const category = await categoryModel.getCategoryById(parseInt(id));
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  await categoryModel.deleteCategory(parseInt(id));
};

const getStats = async () => {
  const categories = await categoryModel.getCategories();
  const totalCategories = categories.length;
  
  let totalCourses = 0;
  for (const cat of categories) {
    const count = await courseModel.countCourses({ categoryId: cat.id });
    totalCourses += count || 0;
  }
  
  const avgPerCategory = totalCategories > 0 ? (totalCourses / totalCategories).toFixed(2) : 0;
  
  return {
    totalCourses,
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













