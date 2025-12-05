const { query, execute } = require('../config/database');

const getVideosByCourseId = async (courseId, { onlyPreview = false, sectionId = null, categoryId = null } = {}) => {
  let sql = `
    SELECT 
      v.id, 
      v.course_id, 
      v.section_id, 
      v.title, 
      v.url, 
      v.duration, 
      v.\`order\`, 
      v.preview, 
      v.created_at, 
      v.updated_at,
      c.category_id,
      cat.name AS category_name
    FROM videos v
    INNER JOIN courses c ON v.course_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE v.course_id = ?
  `;
  const params = [parseInt(courseId, 10)];

  // Convert sectionId to integer if provided
  if (sectionId !== null && sectionId !== undefined && sectionId !== '') {
    const parsedSectionId = parseInt(sectionId, 10);
    if (!isNaN(parsedSectionId)) {
      sql += ' AND v.section_id = ?';
      params.push(parsedSectionId);
    }
  }

  // Convert categoryId to integer if provided
  if (categoryId !== null && categoryId !== undefined && categoryId !== '') {
    const parsedCategoryId = parseInt(categoryId, 10);
    if (!isNaN(parsedCategoryId)) {
      sql += ' AND c.category_id = ?';
      params.push(parsedCategoryId);
    }
  }

  if (onlyPreview) {
    sql += ' AND v.preview = 1';
  }

  sql += ' ORDER BY v.\`order\` ASC';
  
  console.log('getVideosByCourseId - SQL:', sql);
  console.log('getVideosByCourseId - params:', params);
  console.log('getVideosByCourseId - courseId:', courseId, 'sectionId:', sectionId, 'type:', typeof sectionId);
  
  const results = await query(sql, params);
  console.log('getVideosByCourseId - results count:', results?.length, 'results:', results);
  return results;
};

const getVideosBySectionId = async (sectionId, { onlyPreview = false } = {}) => {
  const clauses = ['section_id = ?'];
  const params = [sectionId];

  if (onlyPreview) {
    clauses.push('preview = 1');
  }

  const sql = `
    SELECT id, course_id, section_id, title, url, duration, \`order\`, preview, created_at, updated_at
    FROM videos
    WHERE ${clauses.join(' AND ')}
    ORDER BY \`order\` ASC
  `;
  return query(sql, params);
};

const getVideoById = async (id) => {
  const rows = await query(
    'SELECT id, course_id, section_id, title, url, duration, `order`, preview, created_at, updated_at FROM videos WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const createVideo = async ({ courseId, sectionId, title, url, duration, order, preview }) => {
  const sql = `
    INSERT INTO videos (course_id, section_id, title, url, duration, \`order\`, preview)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    parseInt(courseId, 10),
    parseInt(sectionId, 10),
    title,
    url,
    parseInt(duration, 10),
    parseInt(order, 10),
    preview ? 1 : 0
  ];
  
  console.log('createVideo model - SQL:', sql);
  console.log('createVideo model - params:', params);
  
  const [result] = await execute(sql, params);
  
  console.log('createVideo model - insertId:', result.insertId);
  
  const createdVideo = await getVideoById(result.insertId);
  console.log('createVideo model - createdVideo:', createdVideo);
  
  return createdVideo;
};

const updateVideo = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    section_id: data.sectionId,
    title: data.title,
    url: data.url,
    duration: data.duration,
    '`order`': data.order,
    preview: data.preview
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getVideoById(id);
  }

  const sql = `UPDATE videos SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getVideoById(id);
};

const deleteVideo = async (id) => {
  await execute('DELETE FROM videos WHERE id = ?', [id]);
};

module.exports = {
  getVideosByCourseId,
  getVideosBySectionId,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo
};












