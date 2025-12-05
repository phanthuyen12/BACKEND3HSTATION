const ApiError = require('../utils/apiError');
const userCourseModel = require('../models/userCourseModel');

const listUserCourses = (userId) => userCourseModel.listUserCourses(userId);

const grantCourse = (userId, courseId) =>
  userCourseModel.grantCourse({ userId, courseId, status: 'active' });

const revokeCourse = async (userId, courseId) => {
  const existing = await userCourseModel.userHasActiveCourse(userId, courseId);
  if (!existing) {
    throw ApiError.notFound('User course not found');
  }
  await userCourseModel.revokeCourse(userId, courseId);
};

module.exports = {
  listUserCourses,
  grantCourse,
  revokeCourse
};

















