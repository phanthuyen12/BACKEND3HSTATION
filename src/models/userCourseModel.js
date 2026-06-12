const { query, execute } = require('../config/database');

const listUserCourses = async (userId) => {
  const sql = `
    SELECT * FROM (
      SELECT
        uc.course_id,
        uc.status,
        uc.created_at,
        c.title,
        c.thumbnail_url,
        c.is_free,
        c.price
      FROM user_course uc
      INNER JOIN courses c ON uc.course_id = c.id
      WHERE uc.user_id = ?

      UNION

      SELECT
        rc.course_id,
        rc.status,
        rc.created_at,
        c.title,
        c.thumbnail_url,
        c.is_free,
        c.price
      FROM rank_courses rc
      INNER JOIN courses c ON rc.course_id = c.id
      INNER JOIN users u ON u.rank_id = rc.rank_id
      INNER JOIN ranks r ON r.id = rc.rank_id
      WHERE u.id = ? AND rc.status = 'active' AND r.status = 'active'
    ) AS combined
    GROUP BY course_id, status, title, thumbnail_url, is_free, price
    ORDER BY MAX(created_at) DESC
  `;
  return query(sql, [userId, userId]);
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
  revokeCourse,
  countTotalStudents
};

