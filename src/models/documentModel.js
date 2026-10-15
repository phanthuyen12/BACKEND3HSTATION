const { query, execute } = require('../config/database');

const listDocuments = async ({ courseId, categoryId, status, search }) => {
  const clauses = [];
  const params = [];

  if (courseId) {
    clauses.push('d.course_id = ?');
    params.push(courseId);
  }

  if (categoryId) {
    clauses.push('d.category_id = ?');
    params.push(categoryId);
  }

  // Only filter by status if status column exists (we'll check dynamically)
  // For now, we'll try to select status and handle error if column doesn't exist
  if (status) {
    clauses.push('d.status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(d.title LIKE ? OR d.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  
  // Try to select with status, if it fails, select without status
  let sql = `
    SELECT 
      d.id, 
      d.title, 
      d.description, 
      d.file_url, 
      d.course_id, 
      d.category_id, 
      d.status,
      d.created_at, 
      d.updated_at,
      c.name AS category_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    ${where}
    ORDER BY d.created_at DESC
  `;

  try {
    return await query(sql, params);
  } catch (error) {
    // If status column doesn't exist, select without it
    if (error.message && error.message.includes('status')) {
      // Remove status from WHERE clause if it was there
      const whereWithoutStatus = clauses
        .filter(c => !c.includes('status'))
        .length ? `WHERE ${clauses.filter(c => !c.includes('status')).join(' AND ')}` : '';
      const paramsWithoutStatus = status 
        ? params.filter((_, i) => clauses[i] && !clauses[i].includes('status'))
        : params;
      
      sql = `
        SELECT 
          d.id, 
          d.title, 
          d.description, 
          d.file_url, 
          d.course_id, 
          d.category_id, 
          'active' as status,
          d.created_at, 
          d.updated_at,
          c.name AS category_name
        FROM documents d
        LEFT JOIN categories c ON d.category_id = c.id
        ${whereWithoutStatus}
        ORDER BY d.created_at DESC
      `;
      return query(sql, paramsWithoutStatus);
    }
    throw error;
  }
};

const getDocumentById = async (id) => {
  let sql = `
    SELECT 
      d.id, 
      d.title, 
      d.description, 
      d.file_url, 
      d.course_id, 
      d.category_id, 
      d.status,
      d.created_at, 
      d.updated_at,
      c.name AS category_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.id = ?
  `;
  
  try {
    const rows = await query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    // If status column doesn't exist, select without it
    if (error.message && error.message.includes('status')) {
      sql = `
        SELECT 
          d.id, 
          d.title, 
          d.description, 
          d.file_url, 
          d.course_id, 
          d.category_id, 
          'active' as status,
          d.created_at, 
          d.updated_at,
          c.name AS category_name
        FROM documents d
        LEFT JOIN categories c ON d.category_id = c.id
        WHERE d.id = ?
      `;
      const rows = await query(sql, [id]);
      return rows[0] || null;
    }
    throw error;
  }
};

const createDocument = async ({ title, description, fileUrl, courseId, categoryId, status = 'active' }) => {
  // Convert undefined to null for MySQL compatibility
  const params = [
    title,
    description !== undefined ? description : null,
    fileUrl,
    courseId !== undefined ? courseId : null,
    categoryId !== undefined ? categoryId : null,
    status
  ];
  
  // Try to insert with status, if column doesn't exist, it will fail and we'll handle it
  const sql = `
    INSERT INTO documents (title, description, file_url, course_id, category_id, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  try {
    const [result] = await execute(sql, params);
    return getDocumentById(result.insertId);
  } catch (error) {
    // If status column doesn't exist, insert without it
    if (error.message && error.message.includes('status')) {
      const sqlWithoutStatus = `
        INSERT INTO documents (title, description, file_url, course_id, category_id)
        VALUES (?, ?, ?, ?, ?)
      `;
      const paramsWithoutStatus = params.slice(0, -1); // Remove status
      const [result] = await execute(sqlWithoutStatus, paramsWithoutStatus);
      return getDocumentById(result.insertId);
    }
    throw error;
  }
};

const updateDocument = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    title: data.title,
    description: data.description,
    file_url: data.fileUrl,
    course_id: data.courseId,
    category_id: data.categoryId,
    status: data.status
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getDocumentById(id);
  }

  const sql = `UPDATE documents SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getDocumentById(id);
};

const countDocuments = async ({ courseId, categoryId, status, search }) => {
  const clauses = [];
  const params = [];

  if (courseId) {
    clauses.push('course_id = ?');
    params.push(courseId);
  }

  if (categoryId) {
    clauses.push('category_id = ?');
    params.push(categoryId);
  }

  // Only filter by status if status column exists (we'll check dynamically)
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  
  try {
    const rows = await query(`SELECT COUNT(*) as total FROM documents ${where}`, params);
    return rows[0]?.total || 0;
  } catch (error) {
    // If status column doesn't exist, count without status filter
    if (error.message && error.message.includes('status')) {
      // Remove status from WHERE clause if it was there
      const whereWithoutStatus = clauses
        .filter(c => !c.includes('status'))
        .length ? `WHERE ${clauses.filter(c => !c.includes('status')).join(' AND ')}` : '';
      const paramsWithoutStatus = status 
        ? params.filter((_, i) => clauses[i] && !clauses[i].includes('status'))
        : params;
      
      const rows = await query(`SELECT COUNT(*) as total FROM documents ${whereWithoutStatus}`, paramsWithoutStatus);
      return rows[0]?.total || 0;
    }
    throw error;
  }
};

const deleteDocument = async (id) => {
  await execute('DELETE FROM documents WHERE id = ?', [id]);
};

module.exports = {
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  countDocuments
};

















