const ApiError = require('../utils/apiError');
const courseModel = require('../models/courseModel');
const videoModel = require('../models/videoModel');
const documentModel = require('../models/documentModel');
const courseSectionModel = require('../models/courseSectionModel');
const courseLessonModel = require('../models/courseLessonModel');
const rankCourseModel = require('../models/rankCourseModel');
const { buildPagination } = require('../utils/pagination');
const { isPrivilegedRole } = require('../utils/roles');

const normalizeFreeFilter = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }
  return undefined;
};

const listCourses = async ({ categoryId, free, search, page, limit }) => {
  const { limit: take, offset, page: currentPage } = buildPagination(page, limit);
  const isFree = normalizeFreeFilter(free);

  const [items, total] = await Promise.all([
    courseModel.listCourses({
      categoryId,
      isFree,
      search,
      limit: take,
      offset
    }),
    courseModel.countCourses({ categoryId, isFree, search })
  ]);

  return {
    items,
    pagination: {
      total,
      page: currentPage,
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
};

const canViewPaidCourse = async (course, user) => {
  if (!course) return false;
  if (course.is_free) return true;
  if (!user) return false;
  if (isPrivilegedRole(user.role)) return true;
  if (!user.rank_id) return false;
  
  // Cho phép tất cả user có rank được học khóa học (bypass phân quyền Admin)
  return true;
};

const getCourseDetail = async ({ courseId, user }) => {
  const course = await courseModel.getCourseById(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  const canViewFull = await canViewPaidCourse(course, user);

  // Lấy sections với lessons
  const sections = await courseSectionModel.getSectionsByCourseId(courseId);
  const sectionsWithLessons = await Promise.all(
    sections.map(async (section) => {
      const lessons = await courseLessonModel.getLessonsBySectionId(section.id);
      return {
        ...section,
        lessons
      };
    })
  );

  const [videos, documents] = await Promise.all([
    videoModel.getVideosByCourseId(courseId, { onlyPreview: !canViewFull }),
    documentModel.listDocuments({ courseId })
  ]);

  return {
    ...course,
    can_view_full: canViewFull,
    sections: sectionsWithLessons,
    videos,
    documents
  };
};

const createCourse = async (payload) => {
  const existing = await courseModel.getCourseByTitle(payload.title);
  if (existing) {
    throw ApiError.badRequest('Course title must be unique');
  }

  return courseModel.createCourse(payload);
};

const updateCourse = async (id, payload) => {
  const course = await courseModel.getCourseById(id);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  if (payload.title && payload.title !== course.title) {
    const duplicate = await courseModel.getCourseByTitle(payload.title);
    if (duplicate && duplicate.id !== id) {
      throw ApiError.badRequest('Course title must be unique');
    }
  }

  return courseModel.updateCourse(id, payload);
};

const deleteCourse = async (id) => {
  const course = await courseModel.getCourseById(id);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }
  await courseModel.deleteCourse(id);
};

module.exports = {
  listCourses,
  getCourseDetail,
  createCourse,
  updateCourse,
  deleteCourse
};
