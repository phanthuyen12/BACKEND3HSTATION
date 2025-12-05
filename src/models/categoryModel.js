const { query, execute } = require('../config/database');

const getCategories = async () => {
  return query(
    'SELECT id, name, description, parent_id, created_at, updated_at FROM categories ORDER BY name ASC'
  );
};

const getCategoryById = async (id) => {
  const rows = await query(
    'SELECT id, name, description, parent_id, created_at, updated_at FROM categories WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const getCategoryByName = async (name) => {
  const rows = await query('SELECT * FROM categories WHERE name = ?', [name]);
  return rows[0] || null;
};

const createCategory = async ({ name, description = null, parentId = null }) => {
  const sql = `
    INSERT INTO categories (name, description, parent_id)
    VALUES (?, ?, ?)
  `;
  const [result] = await execute(sql, [name, description, parentId]);
  return getCategoryById(result.insertId);
};

const updateCategory = async (id, { name, description, parentId }) => {
  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }

  if (description !== undefined) {
    fields.push('description = ?');
    values.push(description);
  }

  if (parentId !== undefined) {
    fields.push('parent_id = ?');
    values.push(parentId);
  }

  if (!fields.length) {
    return getCategoryById(id);
  }

  const sql = `UPDATE categories SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getCategoryById(id);
};

const deleteCategory = async (id) => {
  await execute('DELETE FROM categories WHERE id = ?', [id]);
};

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory
};

















