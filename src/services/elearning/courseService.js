const ApiError = require('../../utils/apiError');
const courseModel = require('../../models/elearning/courseModel');
const categoryModel = require('../../models/categoryModel');
const userCourseModel = require('../../models/userCourseModel');
const { buildPagination } = require('../../utils/pagination');

const listCourses = async ({ page, limit, search, category }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  
  const categoryId = category ? parseInt(category) : null;
  
  const [items, total] = await Promise.all([
    courseModel.listCourses({
      categoryId,
      search,
      limit: take,
      offset
    }),
    courseModel.countCourses({ categoryId, search })
  ]);

  const formattedItems = items.map(course => ({
    id: String(course.id),
    title: course.title,
    shortDescription: course.short_description || '',
    description: course.description || '',
    category: course.category_name || '',
    categoryId: course.category_id ? String(course.category_id) : null,
    thumbnail: course.thumbnail_url || '',
    price: String(course.price || 0),
    level: course.level || 'beginner',
    students: course.students || 0,
    rating: course.rating || 0,
    duration: course.duration || '',
    lessons: course.lessons || 0,
    status: course.status || 'active',
    createdAt: course.created_at,
    updatedAt: course.updated_at
  }));

  return {
    data: formattedItems,
    pagination: {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getCourseById = async (id) => {
  const course = await courseModel.getCourseById(parseInt(id));
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  const sections = await courseModel.getCourseSections(parseInt(id));
  
  return {
    id: String(course.id),
    title: course.title,
    description: course.description || '',
    category: course.category_name || '',
    thumbnail: course.thumbnail_url || '',
    price: String(course.price || 0),
    level: course.level || 'beginner',
    students: course.students || 0,
    rating: course.rating || 0,
    duration: course.duration || '',
    lessons: course.lessons || 0,
    content: course.content || '',
    sections: sections || [],
    createdAt: course.created_at,
    updatedAt: course.updated_at
  };
};

const createCourse = async (payload) => {
  const category = await categoryModel.getCategoryById(parseInt(payload.categoryId));
  if (!category) {
    throw ApiError.badRequest('Category not found');
  }

  const course = await courseModel.createCourse({
    title: payload.title,
    shortDescription: payload.shortDescription,
    description: payload.description,
    categoryId: parseInt(payload.categoryId),
    thumbnail: payload.thumbnail,
    price: parseFloat(payload.price) || 0,
    level: payload.level || 'beginner',
    duration: payload.duration || '',
    lessons: payload.lessons || 0,
    content: payload.content || '',
    status: payload.status || 'active'
  });

  return formatCourseResponse(course, category);
};

const updateCourse = async (id, payload) => {
  const course = await courseModel.getCourseById(parseInt(id));
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  const updateData = {};
  if (payload.categoryId) {
    const category = await categoryModel.getCategoryById(parseInt(payload.categoryId));
    if (!category) {
      throw ApiError.badRequest('Category not found');
    }
    updateData.categoryId = parseInt(payload.categoryId);
  }

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.shortDescription !== undefined) updateData.shortDescription = payload.shortDescription;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.thumbnail !== undefined) updateData.thumbnail = payload.thumbnail;
  if (payload.price !== undefined) updateData.price = parseFloat(payload.price);
  if (payload.level !== undefined) updateData.level = payload.level;
  if (payload.duration !== undefined) updateData.duration = payload.duration;
  if (payload.lessons !== undefined) updateData.lessons = parseInt(payload.lessons);
  if (payload.content !== undefined) updateData.content = payload.content;
  if (payload.status !== undefined) updateData.status = payload.status;

  const updated = await courseModel.updateCourse(parseInt(id), updateData);
  const category = await categoryModel.getCategoryById(updated.category_id);
  
  return formatCourseResponse(updated, category);
};

const deleteCourse = async (id) => {
  const course = await courseModel.getCourseById(parseInt(id));
  if (!course) {
    throw ApiError.notFound('Course not found');
  }
  await courseModel.deleteCourse(parseInt(id));
};

const getStats = async () => {
  const totalCourses = await courseModel.countCourses({});
  const totalStudents = await userCourseModel.countTotalStudents();
  
  return {
    totalCourses,
    totalStudents: totalStudents || 0
  };
};

const formatCourseResponse = (course, category) => {
  return {
    id: String(course.id),
    title: course.title,
    shortDescription: course.short_description || '',
    description: course.description || '',
    category: category ? category.name : '',
    categoryId: course.category_id ? String(course.category_id) : null,
    thumbnail: course.thumbnail_url || '',
    price: String(course.price || 0),
    level: course.level || 'beginner',
    students: course.students || 0,
    rating: course.rating || 0,
    duration: course.duration || '',
    lessons: course.lessons || 0,
    status: course.status || 'active',
    createdAt: course.created_at,
    updatedAt: course.updated_at
  };
};

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getStats
};













