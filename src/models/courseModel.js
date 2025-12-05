const { query, execute } = require('../config/database');

const baseSelect = `
  SELECT
    c.id,
    c.title,
    c.description,
    c.category_id,
    c.is_free,
    c.price,
    c.thumbnail_url,
    c.created_at,
    c.updated_at,
    cat.name AS category_name
  FROM courses c
  LEFT JOIN categories cat ON c.category_id = cat.id
`;

const listCourses = async ({ categoryId, isFree, search, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (categoryId) {
    clauses.push('c.category_id = ?');
    params.push(categoryId);
  }

  if (typeof isFree === 'boolean') {
    clauses.push('c.is_free = ?');
    params.push(isFree);
  }

  if (search) {
    clauses.push('c.title LIKE ?');
    params.push(`%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `${baseSelect} ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return query(sql, params);
};

const countCourses = async ({ categoryId, isFree, search }) => {
  const clauses = [];
  const params = [];

  if (categoryId) {
    clauses.push('category_id = ?');
    params.push(categoryId);
  }

  if (typeof isFree === 'boolean') {
    clauses.push('is_free = ?');
    params.push(isFree);
  }

  if (search) {
    clauses.push('title LIKE ?');
    params.push(`%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(`SELECT COUNT(*) as total FROM courses ${where}`, params);
  return rows[0]?.total || 0;
};

const getCourseById = async (id) => {
  const rows = await query(`${baseSelect} WHERE c.id = ?`, [id]);
  return rows[0] || null;
};

const getCourseByTitle = async (title) => {
  const rows = await query('SELECT * FROM courses WHERE title = ?', [title]);
  return rows[0] || null;
};

const createCourse = async ({
  title,
  description,
  categoryId,
  isFree,
  price,
  thumbnailUrl
}) => {
  const sql = `
    INSERT INTO courses (title, description, category_id, is_free, price, thumbnail_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [
    title,
    description,
    categoryId,
    isFree,
    price,
    thumbnailUrl
  ]);
  return getCourseById(result.insertId);
};

const updateCourse = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    title: data.title,
    description: data.description,
    category_id: data.categoryId,
    is_free: data.isFree,
    price: data.price,
    thumbnail_url: data.thumbnailUrl
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getCourseById(id);
  }

  const sql = `UPDATE courses SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getCourseById(id);
};

const deleteCourse = async (id) => {
  await execute('DELETE FROM courses WHERE id = ?', [id]);
};

module.exports = {
  listCourses,
  countCourses,
  getCourseById,
  getCourseByTitle,
  createCourse,
  updateCourse,
  deleteCourse
};

















