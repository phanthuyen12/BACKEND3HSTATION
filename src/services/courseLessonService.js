const ApiError = require('../utils/apiError');
const courseLessonModel = require('../models/courseLessonModel');
const courseSectionModel = require('../models/courseSectionModel');
const courseModel = require('../models/courseModel');

const getLessonsBySectionId = async (sectionId) => {
  const section = await courseSectionModel.getSectionById(sectionId);
  if (!section) {
    throw ApiError.notFound('Section not found');
  }

  return courseLessonModel.getLessonsBySectionId(sectionId);
};

const getLessonsByCourseId = async (courseId) => {
  const course = await courseModel.getCourseById(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  return courseLessonModel.getLessonsByCourseId(courseId);
};

const getLessonById = async (id) => {
  const lesson = await courseLessonModel.getLessonById(id);
  if (!lesson) {
    throw ApiError.notFound('Lesson not found');
  }
  return lesson;
};

const createLesson = async ({ sectionId, courseId, title, duration, type, content, order }) => {
  // Kiểm tra section tồn tại
  const section = await courseSectionModel.getSectionById(sectionId);
  if (!section) {
    throw ApiError.notFound('Section not found');
  }

  // Kiểm tra course tồn tại
  const course = await courseModel.getCourseById(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Kiểm tra section thuộc course
  if (section.course_id !== courseId) {
    throw ApiError.badRequest('Section does not belong to this course');
  }

  // Kiểm tra order trùng lặp nếu có
  if (order !== undefined && order !== null) {
    const existing = await courseLessonModel.getLessonBySectionIdAndOrder(sectionId, order);
    if (existing) {
      throw ApiError.badRequest('Order already exists for this section');
    }
  }

  // Validate type
  const validTypes = ['video', 'text', 'quiz'];
  const lessonType = type || 'video';
  if (!validTypes.includes(lessonType)) {
    throw ApiError.badRequest(`Type must be one of: ${validTypes.join(', ')}`);
  }

  return courseLessonModel.createLesson({
    sectionId,
    courseId,
    title,
    duration,
    type: lessonType,
    content,
    order: order || 0
  });
};

const updateLesson = async (id, data) => {
  const lesson = await courseLessonModel.getLessonById(id);
  if (!lesson) {
    throw ApiError.notFound('Lesson not found');
  }

  // Kiểm tra order trùng lặp nếu có thay đổi
  if (data.order !== undefined && data.order !== null && data.order !== lesson.order) {
    const existing = await courseLessonModel.getLessonBySectionIdAndOrder(lesson.section_id, data.order);
    if (existing && existing.id !== id) {
      throw ApiError.badRequest('Order already exists for this section');
    }
  }

  // Validate type nếu có thay đổi
  if (data.type !== undefined) {
    const validTypes = ['video', 'text', 'quiz'];
    if (!validTypes.includes(data.type)) {
      throw ApiError.badRequest(`Type must be one of: ${validTypes.join(', ')}`);
    }
  }

  return courseLessonModel.updateLesson(id, data);
};

const deleteLesson = async (id) => {
  const lesson = await courseLessonModel.getLessonById(id);
  if (!lesson) {
    throw ApiError.notFound('Lesson not found');
  }
  await courseLessonModel.deleteLesson(id);
};

module.exports = {
  getLessonsBySectionId,
  getLessonsByCourseId,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson
};







