const { query, execute } = require('../config/database');

const listUserCourses = async (userId) => {
  const sql = `
    SELECT
      uc.course_id,
      uc.status,
      uc.created_at,
      uc.updated_at,
      c.title,
      c.thumbnail_url,
      c.is_free,
      c.price
      ,
      c.status AS course_status,
      cat.name AS category_name
    FROM user_course uc
    INNER JOIN courses c ON uc.course_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE uc.user_id = ?
      AND uc.status = 'active'
      AND c.status = 'active'
    ORDER BY uc.created_at DESC
  `;
  return query(sql, [userId]);
};

const userHasActiveCourse = async (userId, courseId) => {
  const rows = await query(
    "SELECT * FROM user_course WHERE user_id = ? AND course_id = ? AND status = 'active' LIMIT 1",
    [userId, courseId]
  );
  return rows[0] || null;
};

const grantCourse = async ({ userId, courseId, status = 'active' }) => {
  const sql = `
    INSERT INTO user_course (user_id, course_id, status)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP
  `;
  await execute(sql, [userId, courseId, status]);
  return userHasActiveCourse(userId, courseId);
};

const grantManyCourses = async ({ userId, courseIds = [], status = 'active' }) => {
  const normalizedUserId = Number(userId);
  const normalizedCourseIds = Array.isArray(courseIds)
    ? [...new Set(courseIds.map((courseId) => Number(courseId)).filter((courseId) => Number.isInteger(courseId) && courseId > 0))]
    : [];

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0 || !normalizedCourseIds.length) {
    return [];
  }

  const placeholders = normalizedCourseIds.map(() => '(?, ?, ?)').join(', ');
  const values = normalizedCourseIds.flatMap((courseId) => [normalizedUserId, courseId, status]);

  await execute(
    `
      INSERT INTO user_course (user_id, course_id, status)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP
    `,
    values
  );

  return listUserCourses(normalizedUserId);
};

const revokeCourse = async (userId, courseId) => {
  await execute('DELETE FROM user_course WHERE user_id = ? AND course_id = ?', [userId, courseId]);
};

const countTotalStudents = async () => {
  const rows = await query('SELECT COUNT(DISTINCT user_id) as total FROM user_course WHERE status = ?', ['active']);
  return rows[0]?.total || 0;
};

module.exports = {
  listUserCourses,
  userHasActiveCourse,
  grantCourse,
  grantManyCourses,
  revokeCourse,
  countTotalStudents
};
