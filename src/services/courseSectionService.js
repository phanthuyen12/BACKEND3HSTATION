const ApiError = require('../utils/apiError');
const courseSectionModel = require('../models/courseSectionModel');
const courseModel = require('../models/courseModel');
const courseLessonModel = require('../models/courseLessonModel');

const getSectionsByCourseId = async (courseId) => {
  const course = await courseModel.getCourseById(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  const sections = await courseSectionModel.getSectionsByCourseId(courseId);
  
  // Lấy lessons cho mỗi section
  const sectionsWithLessons = await Promise.all(
    sections.map(async (section) => {
      const lessons = await courseLessonModel.getLessonsBySectionId(section.id);
      return {
        ...section,
        lessons
      };
    })
  );

  return sectionsWithLessons;
};

const getSectionById = async (id) => {
  const section = await courseSectionModel.getSectionById(id);
  if (!section) {
    throw ApiError.notFound('Section not found');
  }
  return section;
};

const createSection = async ({ courseId, title, order }) => {
  const course = await courseModel.getCourseById(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  let finalOrder = order;

  // Nếu order không được truyền hoặc null/undefined, tự động tính order tiếp theo
  if (finalOrder === undefined || finalOrder === null) {
    const maxOrder = await courseSectionModel.getMaxOrderByCourseId(courseId);
    finalOrder = maxOrder + 1;
  } else {
    // Nếu order được truyền nhưng đã tồn tại, tự động tăng lên order tiếp theo
    const existing = await courseSectionModel.getSectionByCourseIdAndOrder(courseId, finalOrder);
    if (existing) {
      const maxOrder = await courseSectionModel.getMaxOrderByCourseId(courseId);
      finalOrder = maxOrder + 1;
    }
  }

  return courseSectionModel.createSection({ courseId, title, order: finalOrder });
};

const updateSection = async (id, data) => {
  const section = await courseSectionModel.getSectionById(id);
  if (!section) {
    throw ApiError.notFound('Section not found');
  }

  // Kiểm tra order trùng lặp nếu có thay đổi
  if (data.order !== undefined && data.order !== null && data.order !== section.order) {
    const existing = await courseSectionModel.getSectionByCourseIdAndOrder(section.course_id, data.order);
    if (existing && existing.id !== id) {
      throw ApiError.badRequest('Order already exists for this course');
    }
  }

  return courseSectionModel.updateSection(id, data);
};

const deleteSection = async (id) => {
  const section = await courseSectionModel.getSectionById(id);
  if (!section) {
    throw ApiError.notFound('Section not found');
  }
  await courseSectionModel.deleteSection(id);
};

module.exports = {
  getSectionsByCourseId,
  getSectionById,
  createSection,
  updateSection,
  deleteSection
};







