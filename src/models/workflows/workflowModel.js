const { query, execute } = require('../../config/database');

const listWorkflows = async ({ categoryId, search, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (categoryId) {
    clauses.push('w.category_id = ?');
    params.push(categoryId);
  }

  if (search) {
    clauses.push('(w.name LIKE ? OR w.description LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  
  const sql = `
    SELECT 
      w.id,
      w.name,
      w.description,
      w.category_id,
      wc.name AS category_name,
      w.image,
      w.price,
      w.tags,
      w.content,
      w.status,
      w.created_at,
      w.updated_at,
      COUNT(wr.id) AS registration_count
    FROM workflows w
    LEFT JOIN workflow_categories wc ON w.category_id = wc.id
    LEFT JOIN workflow_registrations wr ON w.id = wr.workflow_id
    ${where}
    GROUP BY w.id, w.name, w.description, w.category_id, wc.name, w.image, w.price, w.tags, w.content, w.status, w.created_at, w.updated_at
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  const rows = await query(sql, params);
  
  // Parse JSON tags
  return rows.map(row => ({
    ...row,
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : null
  }));
};

const countWorkflows = async ({ categoryId, search }) => {
  const clauses = [];
  const params = [];

  if (categoryId) {
    clauses.push('category_id = ?');
    params.push(categoryId);
  }

  if (search) {
    clauses.push('(name LIKE ? OR description LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(`SELECT COUNT(*) as total FROM workflows ${where}`, params);
  return rows[0]?.total || 0;
};

const getWorkflowById = async (id) => {
  const sql = `
    SELECT 
      w.id,
      w.name,
      w.description,
      w.category_id,
      wc.name AS category_name,
      w.image,
      w.price,
      w.tags,
      w.content,
      w.status,
      w.created_at,
      w.updated_at,
      COUNT(wr.id) AS registration_count
    FROM workflows w
    LEFT JOIN workflow_categories wc ON w.category_id = wc.id
    LEFT JOIN workflow_registrations wr ON w.id = wr.workflow_id
    WHERE w.id = ?
    GROUP BY w.id, w.name, w.description, w.category_id, wc.name, w.image, w.price, w.tags, w.content, w.status, w.created_at, w.updated_at
  `;
  const rows = await query(sql, [id]);
  if (!rows[0]) return null;
  
  // Parse JSON tags
  return {
    ...rows[0],
    tags: rows[0].tags ? (typeof rows[0].tags === 'string' ? JSON.parse(rows[0].tags) : rows[0].tags) : null
  };
};

const createWorkflow = async ({ name, description, categoryId, image, price, tags, content, status }) => {
  const sql = `
    INSERT INTO workflows (name, description, category_id, image, price, tags, content, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const tagsJson = tags ? JSON.stringify(tags) : null;
  const [result] = await execute(sql, [
    name,
    description || null,
    categoryId,
    image || null,
    price,
    tagsJson,
    content || null,
    status || 'active'
  ]);
  return getWorkflowById(result.insertId);
};

const updateWorkflow = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    name: data.name,
    description: data.description,
    category_id: data.categoryId,
    image: data.image,
    price: data.price,
    tags: data.tags ? JSON.stringify(data.tags) : undefined,
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
    return getWorkflowById(id);
  }

  const sql = `UPDATE workflows SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getWorkflowById(id);
};

const deleteWorkflow = async (id) => {
  await execute('DELETE FROM workflows WHERE id = ?', [id]);
};

const countAllWorkflows = async () => {
  const rows = await query('SELECT COUNT(*) as total FROM workflows');
  return rows[0]?.total || 0;
};

module.exports = {
  listWorkflows,
  countWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  countAllWorkflows
};

