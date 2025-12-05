const courseLessonService = require('../services/courseLessonService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const getLessonsBySection = asyncHandler(async (req, res) => {
  const data = await courseLessonService.getLessonsBySectionId(req.params.section_id);
  return successResponse(res, data);
});

const getLessonsByCourse = asyncHandler(async (req, res) => {
  const data = await courseLessonService.getLessonsByCourseId(req.params.course_id);
  return successResponse(res, data);
});

const getLessonById = asyncHandler(async (req, res) => {
  const data = await courseLessonService.getLessonById(req.params.id);
  return successResponse(res, data);
});

const createLesson = asyncHandler(async (req, res) => {
  const lesson = await courseLessonService.createLesson({
    sectionId: req.params.section_id,
    courseId: req.body.course_id,
    title: req.body.title,
    duration: req.body.duration,
    type: req.body.type,
    content: req.body.content,
    order: req.body.order
  });
  return successResponse(res, lesson, 'Lesson created', 201);
});

const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await courseLessonService.updateLesson(req.params.id, {
    title: req.body.title,
    duration: req.body.duration,
    type: req.body.type,
    content: req.body.content,
    order: req.body.order
  });
  return successResponse(res, lesson, 'Lesson updated');
});

const deleteLesson = asyncHandler(async (req, res) => {
  await courseLessonService.deleteLesson(req.params.id);
  return successResponse(res, {}, 'Lesson deleted');
});

module.exports = {
  getLessonsBySection,
  getLessonsByCourse,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson
};







