const courseService = require('../services/courseService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const mapCoursePayload = (body) => ({
  title: body.title,
  description: body.description,
  categoryId: body.category_id,
  isFree: body.is_free,
  price: body.price,
  thumbnailUrl: body.thumbnail_url
});

const listCourses = asyncHandler(async (req, res) => {
  const data = await courseService.listCourses({
    categoryId: req.query.category_id,
    free: req.query.free,
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit
  });

  return successResponse(res, data);
});

const getCourseDetail = asyncHandler(async (req, res) => {
  const data = await courseService.getCourseDetail({
    courseId: req.params.id,
    user: req.user || null
  });

  return successResponse(res, data);
});

const createCourse = asyncHandler(async (req, res) => {
  const course = await courseService.createCourse(mapCoursePayload(req.body));
  return successResponse(res, course, 'Course created', 201);
});

const updateCourse = asyncHandler(async (req, res) => {
  const course = await courseService.updateCourse(req.params.id, mapCoursePayload(req.body));
  return successResponse(res, course, 'Course updated');
});

const deleteCourse = asyncHandler(async (req, res) => {
  await courseService.deleteCourse(req.params.id);
  return successResponse(res, {}, 'Course deleted');
});

module.exports = {
  listCourses,
  getCourseDetail,
  createCourse,
  updateCourse,
  deleteCourse
};

