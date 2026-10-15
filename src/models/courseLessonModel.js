const { query, execute } = require('../config/database');

const getLessonsBySectionId = async (sectionId) => {
  const sql = `
    SELECT id, section_id, course_id, title, duration, type, content, \`order\`, created_at, updated_at
    FROM course_lessons
    WHERE section_id = ?
    ORDER BY \`order\` ASC
  `;
  return query(sql, [sectionId]);
};

const getLessonsByCourseId = async (courseId) => {
  const sql = `
    SELECT id, section_id, course_id, title, duration, type, content, \`order\`, created_at, updated_at
    FROM course_lessons
    WHERE course_id = ?
    ORDER BY \`order\` ASC
  `;
  return query(sql, [courseId]);
};

const getLessonById = async (id) => {
  const rows = await query(
    'SELECT id, section_id, course_id, title, duration, type, content, `order`, created_at, updated_at FROM course_lessons WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const getLessonBySectionIdAndOrder = async (sectionId, order) => {
  const rows = await query(
    'SELECT * FROM course_lessons WHERE section_id = ? AND `order` = ?',
    [sectionId, order]
  );
  return rows[0] || null;
};

const createLesson = async ({ sectionId, courseId, title, duration, type, content, order }) => {
  const sql = `
    INSERT INTO course_lessons (section_id, course_id, title, duration, type, content, \`order\`)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [
    sectionId,
    courseId,
    title,
    duration || null,
    type || 'video',
    content || null,
    order || 0
  ]);
  return getLessonById(result.insertId);
};

const updateLesson = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    title: data.title,
    duration: data.duration,
    type: data.type,
    content: data.content,
    '`order`': data.order
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getLessonById(id);
  }

  const sql = `UPDATE course_lessons SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getLessonById(id);
};

const deleteLesson = async (id) => {
  await execute('DELETE FROM course_lessons WHERE id = ?', [id]);
};

const countLessonsBySectionId = async (sectionId) => {
  const rows = await query('SELECT COUNT(*) as total FROM course_lessons WHERE section_id = ?', [sectionId]);
  return rows[0]?.total || 0;
};

module.exports = {
  getLessonsBySectionId,
  getLessonsByCourseId,
  getLessonById,
  getLessonBySectionIdAndOrder,
  createLesson,
  updateLesson,
  deleteLesson,
  countLessonsBySectionId
};







