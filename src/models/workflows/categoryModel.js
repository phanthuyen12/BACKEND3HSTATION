const { query, execute } = require('../../config/database');

const listCategories = async () => {
  const sql = `
    SELECT 
      wc.id,
      wc.name,
      wc.created_at,
      wc.updated_at,
      COUNT(w.id) AS workflow_count
    FROM workflow_categories wc
    LEFT JOIN workflows w ON wc.id = w.category_id
    GROUP BY wc.id, wc.name, wc.created_at, wc.updated_at
    ORDER BY wc.name ASC
  `;
  return query(sql);
};

const getCategoryById = async (id) => {
  const rows = await query(
    'SELECT id, name, created_at, updated_at FROM workflow_categories WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const getCategoryByName = async (name) => {
  const rows = await query(
    'SELECT id, name, created_at, updated_at FROM workflow_categories WHERE name = ?',
    [name]
  );
  return rows[0] || null;
};

const createCategory = async ({ name }) => {
  const sql = `
    INSERT INTO workflow_categories (name)
    VALUES (?)
  `;
  const [result] = await execute(sql, [name]);
  return getCategoryById(result.insertId);
};

const updateCategory = async (id, { name }) => {
  const sql = `
    UPDATE workflow_categories 
    SET name = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;
  await execute(sql, [name, id]);
  return getCategoryById(id);
};

const deleteCategory = async (id) => {
  await execute('DELETE FROM workflow_categories WHERE id = ?', [id]);
};

const countCategories = async () => {
  const rows = await query('SELECT COUNT(*) as total FROM workflow_categories');
  return rows[0]?.total || 0;
};

const countWorkflowsByCategory = async () => {
  const sql = `
    SELECT 
      wc.id,
      COUNT(w.id) AS workflow_count
    FROM workflow_categories wc
    LEFT JOIN workflows w ON wc.id = w.category_id
    GROUP BY wc.id
  `;
  return query(sql);
};

module.exports = {
  listCategories,
  getCategoryById,
  getCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  countCategories,
  countWorkflowsByCategory
};



