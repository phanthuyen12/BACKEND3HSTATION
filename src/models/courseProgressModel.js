const { query, execute } = require('../config/database');

const VIDEO_COMPLETION_THRESHOLD = 90;

const mapSummaryRow = (row) => ({
  course_id: Number(row.course_id),
  total_lessons: Number(row.total_lessons || 0),
  completed_lessons: Number(row.completed_lessons || 0),
  completion_percent: Number(row.completion_percent || 0),
  last_completed_at: row.last_completed_at || null,
  last_watched_at: row.last_watched_at || null,
  last_progress_at: row.last_progress_at || null
});

const upsertProgress = async ({ userId, courseId, lessonId, completed }) => {
  const sql = `
    INSERT INTO course_progress (user_id, course_id, lesson_id, completed, completed_at, last_watched_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      completed = VALUES(completed),
      completed_at = VALUES(completed_at),
      last_watched_at = VALUES(last_watched_at),
      updated_at = CURRENT_TIMESTAMP
  `;
  const completedAt = completed ? new Date() : null;
  await execute(sql, [userId, courseId, lessonId, completed ? 1 : 0, completedAt, new Date()]);
  return getProgressByLesson({ userId, courseId, lessonId });
};

const upsertVideoProgress = async ({
  userId,
  courseId,
  videoId,
  watchedSeconds = 0,
  durationSeconds = 0,
  lastPositionSeconds = 0,
  progressPercent = 0,
  completed = false
}) => {
  const sql = `
    INSERT INTO course_progress (
      user_id,
      course_id,
      lesson_id,
      video_id,
      watched_seconds,
      duration_seconds,
      last_position_seconds,
      progress_percent,
      completed,
      completed_at,
      last_watched_at
    )
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      watched_seconds = VALUES(watched_seconds),
      duration_seconds = VALUES(duration_seconds),
      last_position_seconds = VALUES(last_position_seconds),
      progress_percent = VALUES(progress_percent),
      completed = VALUES(completed),
      completed_at = VALUES(completed_at),
      last_watched_at = VALUES(last_watched_at),
      updated_at = CURRENT_TIMESTAMP
  `;

  const completedAt = completed ? new Date() : null;
  await execute(sql, [
    userId,
    courseId,
    videoId,
    watchedSeconds,
    durationSeconds,
    lastPositionSeconds,
    progressPercent,
    completed ? 1 : 0,
    completedAt,
    new Date()
  ]);

  return getProgressByVideo({ userId, courseId, videoId });
};

const getProgressByLesson = async ({ userId, courseId, lessonId }) => {
  const rows = await query(
    `
      SELECT
        id,
        user_id,
        course_id,
        lesson_id,
        video_id,
        watched_seconds,
        duration_seconds,
        last_position_seconds,
        progress_percent,
        completed,
        completed_at,
        last_watched_at,
        created_at,
        updated_at
      FROM course_progress
      WHERE user_id = ? AND course_id = ? AND lesson_id = ?
      LIMIT 1
    `,
    [userId, courseId, lessonId]
  );
  return rows[0] || null;
};

const getProgressByVideo = async ({ userId, courseId, videoId }) => {
  const rows = await query(
    `
      SELECT
        id,
        user_id,
        course_id,
        lesson_id,
        video_id,
        watched_seconds,
        duration_seconds,
        last_position_seconds,
        progress_percent,
        completed,
        completed_at,
        last_watched_at,
        created_at,
        updated_at
      FROM course_progress
      WHERE user_id = ? AND course_id = ? AND video_id = ?
      LIMIT 1
    `,
    [userId, courseId, videoId]
  );
  return rows[0] || null;
};

const getCourseProgressSummaries = async (userId, { courseIds = [] } = {}) => {
  const ids = Array.isArray(courseIds)
    ? courseIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
    : [];

  const params = [userId];
  let where = '';

  if (ids.length) {
    const placeholders = ids.map(() => '?').join(', ');
    where = `WHERE c.id IN (${placeholders})`;
    params.push(...ids);
  }

  const rows = await query(
    `
      SELECT
        c.id AS course_id,
        COUNT(DISTINCT v.id) AS total_lessons,
        SUM(
          CASE
            WHEN v.id IS NOT NULL AND COALESCE(cp.completed, 0) = 1 THEN 1
            ELSE 0
          END
        ) AS completed_lessons,
        ROUND(
          CASE
            WHEN COUNT(DISTINCT v.id) = 0 THEN 0
            ELSE (
              SUM(
                CASE
                  WHEN v.id IS NOT NULL AND COALESCE(cp.completed, 0) = 1 THEN 1
                  ELSE 0
                END
              ) / COUNT(DISTINCT v.id)
            ) * 100
          END,
          0
        ) AS completion_percent,
        MAX(cp.completed_at) AS last_completed_at,
        MAX(cp.last_watched_at) AS last_watched_at,
        MAX(cp.updated_at) AS last_progress_at
      FROM courses c
      LEFT JOIN videos v ON v.course_id = c.id
      LEFT JOIN course_progress cp
        ON cp.user_id = ?
        AND cp.course_id = c.id
        AND cp.video_id = v.id
      ${where}
      GROUP BY c.id
      ORDER BY c.id ASC
    `,
    params
  );

  return rows.map(mapSummaryRow);
};

const getVideoProgressMap = async (userId, { courseId = null } = {}) => {
  const params = [userId];
  let where = 'WHERE cp.user_id = ? AND cp.video_id IS NOT NULL';

  if (courseId) {
    where += ' AND cp.course_id = ?';
    params.push(courseId);
  }

  const rows = await query(
    `
      SELECT
        cp.video_id,
        cp.course_id,
        cp.watched_seconds,
        cp.duration_seconds,
        cp.last_position_seconds,
        cp.progress_percent,
        cp.completed,
        cp.completed_at,
        cp.last_watched_at,
        cp.updated_at
      FROM course_progress cp
      ${where}
    `,
    params
  );

  return rows.reduce((acc, row) => {
    acc[String(row.video_id)] = {
      videoId: String(row.video_id),
      courseId: String(row.course_id),
      watchedSeconds: Number(row.watched_seconds || 0),
      durationSeconds: Number(row.duration_seconds || 0),
      lastPositionSeconds: Number(row.last_position_seconds || 0),
      progressPercent: Number(row.progress_percent || 0),
      completed: Boolean(row.completed),
      completedAt: row.completed_at || null,
      lastWatchedAt: row.last_watched_at || null,
      updatedAt: row.updated_at || null
    };
    return acc;
  }, {});
};

const countCompletedCourses = async (userId) => {
  const rows = await getCourseProgressSummaries(userId);
  return rows.filter((row) => row.total_lessons > 0 && row.completed_lessons >= row.total_lessons).length;
};

const countInProgressCourses = async (userId) => {
  const rows = await getCourseProgressSummaries(userId);
  return rows.filter((row) => row.completed_lessons > 0 && row.completed_lessons < row.total_lessons).length;
};

const countCompletedLessons = async (userId) => {
  const rows = await query(
    `
      SELECT COUNT(*) AS total
      FROM course_progress
      WHERE user_id = ?
        AND completed = 1
        AND video_id IS NOT NULL
    `,
    [userId]
  );
  return rows[0]?.total || 0;
};

const getUserCourseProgress = async (userId, courseIds = []) => {
  return getCourseProgressSummaries(userId, { courseIds });
};

module.exports = {
  VIDEO_COMPLETION_THRESHOLD,
  upsertProgress,
  upsertVideoProgress,
  getProgressByLesson,
  getProgressByVideo,
  getCourseProgressSummaries,
  getVideoProgressMap,
  countCompletedCourses,
  countInProgressCourses,
  countCompletedLessons,
  getUserCourseProgress
};
