const ApiError = require('../utils/apiError');
const userCourseService = require('../services/userCourseService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { isPrivilegedRole } = require('../utils/roles');

const ensureOwnerOrAdmin = (req) => {
  const targetUserId = Number(req.params.id);
  if (!isPrivilegedRole(req.user.role) && req.user.id !== targetUserId) {
    throw ApiError.forbidden('Not allowed');
  }
};

const listUserCourses = asyncHandler(async (req, res) => {
  ensureOwnerOrAdmin(req);
  const courses = await userCourseService.listUserCourses(req.params.id);
  return successResponse(res, courses);
});

const grantCourse = asyncHandler(async (req, res) => {
  if (!isPrivilegedRole(req.user.role)) {
    throw ApiError.forbidden('Admin permission required');
  }

  const record = await userCourseService.grantCourse(req.params.id, req.body.course_id);
  return successResponse(res, record, 'Course granted', 201);
});

const revokeCourse = asyncHandler(async (req, res) => {
  if (!isPrivilegedRole(req.user.role)) {
    throw ApiError.forbidden('Admin permission required');
  }

  await userCourseService.revokeCourse(req.params.id, req.params.course_id);
  return successResponse(res, {}, 'Course revoked');
});

module.exports = {
  listUserCourses,
  grantCourse,
  revokeCourse
};
















