const courseService = require('../../services/elearning/courseService');
const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const listCourses = asyncHandler(async (req, res) => {
  const data = await courseService.listCourses({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    category: req.query.category
  });
  return successResponse(res, data);
});

const getCourseById = asyncHandler(async (req, res) => {
  const data = await courseService.getCourseById(req.params.id);
  return successResponse(res, { data });
});

const createCourse = asyncHandler(async (req, res) => {
  const course = await courseService.createCourse(req.body);
  return successResponse(res, { data: course }, 'Course created', 201);
});

const updateCourse = asyncHandler(async (req, res) => {
  const course = await courseService.updateCourse(req.params.id, req.body);
  return successResponse(res, { data: course }, 'Course updated');
});

const deleteCourse = asyncHandler(async (req, res) => {
  await courseService.deleteCourse(req.params.id);
  return successResponse(res, {}, 'Course deleted');
});

const getStats = asyncHandler(async (_req, res) => {
  const stats = await courseService.getStats();
  return successResponse(res, { data: stats });
});

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getStats
};













