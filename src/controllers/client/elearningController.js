const elearningService = require('../../services/client/elearningService');
const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const listCourses = asyncHandler(async (req, res) => {
  const data = await elearningService.listCourses({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    category: req.query.category,
    user: req.user || null
  });
  return successResponse(res, data);
});

const getCourseById = asyncHandler(async (req, res) => {
  const data = await elearningService.getCourseById(req.params.id, req.user || null);
  return successResponse(res, { data });
});

const listCategories = asyncHandler(async (_req, res) => {
  const data = await elearningService.listCategories();
  return successResponse(res, { data, total: data.length });
});

const enrollCourse = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const courseId = req.params.id;
  const data = await elearningService.enrollCourse(userId, courseId);
  return successResponse(res, data, 'Đăng ký khóa học thành công', 201);
});

const checkEnrollment = asyncHandler(async (req, res) => {
  // If user is not authenticated, return not enrolled
  if (!req.user || !req.user.id) {
    return successResponse(res, { isEnrolled: false });
  }
  
  const userId = req.user.id;
  const courseId = req.params.id;
  const data = await elearningService.checkEnrollment(userId, courseId);
  return successResponse(res, data);
});

const getDashboard = asyncHandler(async (req, res) => {
  const data = await elearningService.getStudentDashboard(req.user.id);
  return successResponse(res, { data });
});

const getRankSummary = asyncHandler(async (req, res) => {
  const data = await elearningService.getRankSummaryForUser(req.user.id);
  return successResponse(res, { data });
});

module.exports = {
  listCourses,
  getCourseById,
  listCategories,
  enrollCourse,
  checkEnrollment,
  getDashboard,
  getRankSummary
};












