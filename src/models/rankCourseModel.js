const { query, execute } = require('../config/database');

const listRankCourses = async (rankId) => {
  const rows = await query(
    `
      SELECT
        rc.id,
        rc.rank_id,
        rc.course_id,
        rc.status,
        rc.created_at,
        rc.updated_at,
        c.title AS course_title,
        c.thumbnail_url,
        c.status AS course_status,
        r.code AS rank_code,
        r.name AS rank_name
      FROM rank_courses rc
      INNER JOIN courses c ON rc.course_id = c.id
      INNER JOIN ranks r ON rc.rank_id = r.id
      WHERE rc.rank_id = ?
      ORDER BY rc.created_at DESC
    `,
    [rankId]
  );
  return rows;
};

const getAllowedCourseIdsByRankIds = async (rankIds) => {
  const ids = Array.isArray(rankIds) ? rankIds.filter(Boolean) : [rankIds].filter(Boolean);
  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(', ');
  const rows = await query(
    `
      SELECT DISTINCT course_id
      FROM rank_courses rc
      INNER JOIN ranks r ON r.id = rc.rank_id
      WHERE rc.status = 'active'
        AND r.status = 'active'
        AND rc.rank_id IN (${placeholders})
    `,
    ids
  );
  return rows.map((row) => Number(row.course_id));
};

const syncRankCourses = async ({ rankId, courseIds = [] }) => {
  await execute('DELETE FROM rank_courses WHERE rank_id = ?', [rankId]);
  if (!courseIds.length) {
    return [];
  }

  const values = [];
  const placeholders = courseIds
    .map((courseId) => {
      values.push(rankId, courseId, 'active');
      return '(?, ?, ?)';
    })
    .join(', ');

  await execute(
    `INSERT INTO rank_courses (rank_id, course_id, status) VALUES ${placeholders}`,
    values
  );
  return listRankCourses(rankId);
};

const assignCourse = async ({ rankId, courseId, status = 'active' }) => {
  const sql = `
    INSERT INTO rank_courses (rank_id, course_id, status)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP
  `;
  await execute(sql, [rankId, courseId, status]);
  return listRankCourses(rankId);
};

const removeCourse = async ({ rankId, courseId }) => {
  await execute('DELETE FROM rank_courses WHERE rank_id = ? AND course_id = ?', [rankId, courseId]);
};

const isCourseAllowedForRank = async ({ rankId, courseId }) => {
  const rows = await query(
    `
      SELECT 1
      FROM rank_courses rc
      INNER JOIN ranks r ON r.id = rc.rank_id
      WHERE rc.rank_id = ?
        AND rc.course_id = ?
        AND rc.status = 'active'
        AND r.status = 'active'
      LIMIT 1
    `,
    [rankId, courseId]
  );
  return rows.length > 0;
};

module.exports = {
  listRankCourses,
  getAllowedCourseIdsByRankIds,
  syncRankCourses,
  assignCourse,
  removeCourse,
  isCourseAllowedForRank
};
