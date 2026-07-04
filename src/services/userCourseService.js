const ApiError = require('../utils/apiError');
const userCourseModel = require('../models/userCourseModel');
const userModel = require('../models/userModel');
const rankCourseModel = require('../models/rankCourseModel');
const courseProgressModel = require('../models/courseProgressModel');
const { isPrivilegedRole } = require('../utils/roles');

const syncRankCoursesForUser = async (userId) => {
  const user = await userModel.getUserById(parseInt(userId, 10));
  if (!user || isPrivilegedRole(user.role) || !user.rank_id) {
    return [];
  }

  const allowedCourseIds = await rankCourseModel.getAllowedCourseIdsByRankIds([user.rank_id]);
  if (!allowedCourseIds.length) {
    return [];
  }

  return userCourseModel.grantManyCourses({
    userId: parseInt(userId, 10),
    courseIds: allowedCourseIds,
    status: 'active'
  });
};

const listUserCourses = async (userId) => {
  await syncRankCoursesForUser(userId);

  const rows = await userCourseModel.listUserCourses(userId);
  const courseIds = rows.map((row) => Number(row.course_id)).filter(Boolean);
  const progressRows = await courseProgressModel.getCourseProgressSummaries(userId, { courseIds });
  const progressMap = new Map(progressRows.map((row) => [String(row.course_id), row]));

  return rows.map((row) => {
    const progress = progressMap.get(String(row.course_id));
    const totalLessons = Number(progress?.total_lessons || 0);
    const completedLessons = Number(progress?.completed_lessons || 0);
    const completionPercent = Number(progress?.completion_percent || 0);

    return {
      ...row,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      progress: completionPercent,
      completion_percent: completionPercent,
      completed_at: progress?.last_completed_at || null,
      last_watched_at: progress?.last_watched_at || null,
      updated_at: progress?.last_progress_at || row.updated_at || row.created_at,
      course: {
        id: String(row.course_id),
        title: row.title,
        thumbnail_url: row.thumbnail_url || '',
        is_free: row.is_free,
        price: row.price,
        lessons: totalLessons,
        category_name: row.category_name || ''
      }
    };
  });
};

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
  syncRankCoursesForUser,
  grantCourse,
  revokeCourse
};















