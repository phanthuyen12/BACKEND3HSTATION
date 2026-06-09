const { query, execute } = require('../config/database');

const baseSelect = `
  SELECT
    id,
    code,
    name,
    description,
    status,
    created_at,
    updated_at
  FROM ranks
`;

const listRanks = async ({ search, status, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('(code LIKE ? OR name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `${baseSelect} ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return query(sql, params);
};

const countRanks = async ({ search, status }) => {
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('(code LIKE ? OR name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(`SELECT COUNT(*) as total FROM ranks ${where}`, params);
  return rows[0]?.total || 0;
};

const getRankById = async (id) => {
  const rows = await query(`${baseSelect} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const getRankByCode = async (code) => {
  const rows = await query(`${baseSelect} WHERE code = ? LIMIT 1`, [code]);
  return rows[0] || null;
};

const createRank = async ({ code, name, description, status = 'active' }) => {
  const [result] = await execute(
    'INSERT INTO ranks (code, name, description, status) VALUES (?, ?, ?, ?)',
    [code, name, description || null, status]
  );
  return getRankById(result.insertId);
};

const updateRank = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    code: data.code,
    name: data.name,
    description: data.description,
    status: data.status
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getRankById(id);
  }

  const sql = `UPDATE ranks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getRankById(id);
};

const deleteRank = async (id) => {
  await execute('DELETE FROM ranks WHERE id = ?', [id]);
};

const getRankByUserId = async (userId) => {
  const rows = await query(
    `
      SELECT r.*
      FROM users u
      LEFT JOIN ranks r ON u.rank_id = r.id
      WHERE u.id = ?
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] || null;
};

module.exports = {
  listRanks,
  countRanks,
  getRankById,
  getRankByCode,
  createRank,
  updateRank,
  deleteRank,
  getRankByUserId
};
