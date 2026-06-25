const { query, execute } = require('../../config/database');

async function listAll() {
  return await query('SELECT * FROM facebook_tags ORDER BY name ASC');
}

async function create({ name, color }) {
  const sql = 'INSERT INTO facebook_tags (name, color) VALUES (?, ?)';
  const [result] = await execute(sql, [name, color]);
  return { id: result.insertId, name, color };
}

async function deleteById(id) {
  const sql = 'DELETE FROM facebook_tags WHERE id = ?';
  await execute(sql, [id]);
}

module.exports = {
  listAll,
  create,
  deleteById,
};
