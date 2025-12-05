const { query, execute } = require('../config/database');

const getSectionsByCourseId = async (courseId) => {
  const sql = `
    SELECT id, course_id, title, \`order\`, created_at, updated_at
    FROM course_sections
    WHERE course_id = ?
    ORDER BY \`order\` ASC
  `;
  return query(sql, [courseId]);
};

const getSectionById = async (id) => {
  const rows = await query(
    'SELECT id, course_id, title, `order`, created_at, updated_at FROM course_sections WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const getSectionByCourseIdAndOrder = async (courseId, order) => {
  const rows = await query(
    'SELECT * FROM course_sections WHERE course_id = ? AND `order` = ?',
    [courseId, order]
  );
  return rows[0] || null;
};

const createSection = async ({ courseId, title, order }) => {
  const sql = `
    INSERT INTO course_sections (course_id, title, \`order\`)
    VALUES (?, ?, ?)
  `;
  const [result] = await execute(sql, [courseId, title, order || 0]);
  return getSectionById(result.insertId);
};

const updateSection = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    title: data.title,
    '`order`': data.order
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getSectionById(id);
  }

  const sql = `UPDATE course_sections SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getSectionById(id);
};

const deleteSection = async (id) => {
  await execute('DELETE FROM course_sections WHERE id = ?', [id]);
};

const countSectionsByCourseId = async (courseId) => {
  const rows = await query('SELECT COUNT(*) as total FROM course_sections WHERE course_id = ?', [courseId]);
  return rows[0]?.total || 0;
};

const getMaxOrderByCourseId = async (courseId) => {
  const rows = await query('SELECT MAX(`order`) as maxOrder FROM course_sections WHERE course_id = ?', [courseId]);
  return rows[0]?.maxOrder ?? -1; // Return -1 if no sections exist
};

module.exports = {
  getSectionsByCourseId,
  getSectionById,
  getSectionByCourseIdAndOrder,
  createSection,
  updateSection,
  deleteSection,
  countSectionsByCourseId,
  getMaxOrderByCourseId
};







