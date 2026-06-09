const { query, execute } = require('../config/database');

const upsertProgress = async ({ userId, courseId, lessonId, completed }) => {
  const sql = `
    INSERT INTO course_progress (user_id, course_id, lesson_id, completed, completed_at)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      completed = VALUES(completed),
      completed_at = VALUES(completed_at),
      updated_at = CURRENT_TIMESTAMP
  `;
  const completedAt = completed ? new Date() : null;
  await execute(sql, [userId, courseId, lessonId, completed ? 1 : 0, completedAt]);
  return getProgressByLesson({ userId, courseId, lessonId });
};

const getProgressByLesson = async ({ userId, courseId, lessonId }) => {
  const rows = await query(
    `
      SELECT id, user_id, course_id, lesson_id, completed, completed_at, created_at, updated_at
      FROM course_progress
      WHERE user_id = ? AND course_id = ? AND lesson_id = ?
      LIMIT 1
    `,
    [userId, courseId, lessonId]
  );
  return rows[0] || null;
};

const countCompletedCourses = async (userId) => {
  const rows = await query(
    `
      SELECT COUNT(DISTINCT course_id) AS total
      FROM course_progress
      WHERE user_id = ? AND completed = 1
    `,
    [userId]
  );
  return rows[0]?.total || 0;
};

const countInProgressCourses = async (userId) => {
  const rows = await query(
    `
      SELECT COUNT(DISTINCT course_id) AS total
      FROM course_progress
      WHERE user_id = ? AND completed = 0
    `,
    [userId]
  );
  return rows[0]?.total || 0;
};

const countCompletedLessons = async (userId) => {
  const rows = await query(
    `
      SELECT COUNT(*) AS total
      FROM course_progress
      WHERE user_id = ? AND completed = 1
    `,
    [userId]
  );
  return rows[0]?.total || 0;
};

const getUserCourseProgress = async (userId) => {
  const rows = await query(
    `
      SELECT
        cp.course_id,
        COUNT(*) AS total_lessons,
        SUM(cp.completed) AS completed_lessons,
        MAX(cp.completed_at) AS last_completed_at
      FROM course_progress cp
      WHERE cp.user_id = ?
      GROUP BY cp.course_id
    `,
    [userId]
  );
  return rows;
};

module.exports = {
  upsertProgress,
  getProgressByLesson,
  countCompletedCourses,
  countInProgressCourses,
  countCompletedLessons,
  getUserCourseProgress
};
