const { query, execute } = require('../../config/database');

const baseSelect = `
  SELECT
    c.id,
    c.title,
    c.short_description,
    c.description,
    c.category_id,
    c.price,
    c.thumbnail_url,
    c.level,
    c.students,
    c.rating,
    c.duration,
    c.lessons,
    c.status,
    c.content,
    c.created_at,
    c.updated_at,
    cat.name AS category_name
  FROM courses c
  LEFT JOIN categories cat ON c.category_id = cat.id
`;

const listCourses = async ({ categoryId, search, status, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (categoryId) {
    clauses.push('c.category_id = ?');
    params.push(categoryId);
  }

  if (status) {
    clauses.push('c.status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(c.title LIKE ? OR cat.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  // Ensure limit and offset are integers
  const limitInt = parseInt(limit, 10) || 20;
  const offsetInt = parseInt(offset, 10) || 0;
  const sql = `${baseSelect} ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limitInt, offsetInt);
  return query(sql, params);
};

const countCourses = async ({ categoryId, search, status }) => {
  const clauses = [];
  const params = [];

  if (categoryId) {
    clauses.push('category_id = ?');
    params.push(categoryId);
  }

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(title LIKE ? OR category_id IN (SELECT id FROM categories WHERE name LIKE ?))');
    params.push(`%${search}%`, `%${search}%`);
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

const listAccessibleCourses = async ({ user = null, categoryId, search, limit, offset }) => {
  const clauses = ['c.status = ?'];
  const params = ['active'];

  if (categoryId) {
    clauses.push('c.category_id = ?');
    params.push(categoryId);
  }

  if (search) {
    clauses.push('(c.title LIKE ? OR cat.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (!user || user.role === 'user') {
    clauses.push('c.is_free = 1');
  } else if (user.role !== 'admin' && user.role !== 'super_admin') {
    if (!user.rank_id) {
      clauses.push('c.is_free = 1');
    } else {
      clauses.push('(c.is_free = 1 OR EXISTS (SELECT 1 FROM rank_courses rc INNER JOIN ranks r ON r.id = rc.rank_id WHERE rc.course_id = c.id AND rc.rank_id = ? AND rc.status = "active" AND r.status = "active"))');
      params.push(user.rank_id);
    }
  }

  const where = `WHERE ${clauses.join(' AND ')}`;
  const limitInt = parseInt(limit, 10) || 20;
  const offsetInt = parseInt(offset, 10) || 0;
  const sql = `${baseSelect} ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limitInt, offsetInt);
  return query(sql, params);
};

const countAccessibleCourses = async ({ user = null, categoryId, search }) => {
  const clauses = ['c.status = ?'];
  const params = ['active'];

  if (categoryId) {
    clauses.push('c.category_id = ?');
    params.push(categoryId);
  }

  if (search) {
    clauses.push('(c.title LIKE ? OR cat.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (!user || user.role === 'user') {
    clauses.push('c.is_free = 1');
  } else if (user.role !== 'admin' && user.role !== 'super_admin') {
    if (!user.rank_id) {
      clauses.push('c.is_free = 1');
    } else {
      clauses.push('(c.is_free = 1 OR EXISTS (SELECT 1 FROM rank_courses rc INNER JOIN ranks r ON r.id = rc.rank_id WHERE rc.course_id = c.id AND rc.rank_id = ? AND rc.status = "active" AND r.status = "active"))');
      params.push(user.rank_id);
    }
  }

  const where = `WHERE ${clauses.join(' AND ')}`;
  const rows = await query(`SELECT COUNT(*) as total FROM courses c LEFT JOIN categories cat ON c.category_id = cat.id ${where}`, params);
  return rows[0]?.total || 0;
};

const createCourse = async ({
  title,
  shortDescription,
  description,
  categoryId,
  thumbnail,
  price,
  level,
  duration,
  lessons,
  content,
  status
}) => {
  const sql = `
    INSERT INTO courses (
      title, short_description, description, category_id, thumbnail_url, 
      price, level, duration, lessons, content, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [
    title,
    shortDescription || null,
    description,
    categoryId,
    thumbnail || null,
    price,
    level || 'beginner',
    duration || null,
    lessons || 0,
    content || null,
    status || 'active'
  ]);
  return getCourseById(result.insertId);
};

const updateCourse = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    title: data.title,
    short_description: data.shortDescription,
    description: data.description,
    category_id: data.categoryId,
    thumbnail_url: data.thumbnail,
    price: data.price,
    level: data.level,
    duration: data.duration,
    lessons: data.lessons,
    content: data.content,
    status: data.status
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

const getCourseSections = async (courseId) => {
  // This would typically query a sections/lessons table
  // For now, return empty array - can be implemented later
  return [];
};

module.exports = {
  listCourses,
  countCourses,
  getCourseById,
  getCourseByTitle,
  listAccessibleCourses,
  countAccessibleCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseSections
};
