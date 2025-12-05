const { query, execute } = require('../config/database');

const getUserById = async (id) => {
  const rows = await query(
    'SELECT id, name, email, phone, avatar_url, role, balance, status, address, created_at, updated_at, last_login_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const listUsers = async ({ search, status, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT id, name, email, phone, balance, status, created_at, updated_at, last_login_at 
    FROM users ${where} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  return query(sql, params);
};

const countUsers = async ({ search, status }) => {
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(`SELECT COUNT(*) as total FROM users ${where}`, params);
  return rows[0]?.total || 0;
};

const createUser = async ({ name, email, passwordHash, avatarUrl = null, role = 'user', phone = null, status = 'active' }) => {
  const sql = `
    INSERT INTO users (name, email, password_hash, avatar_url, role, phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [name, email, passwordHash, avatarUrl, role, phone, status]);
  return getUserById(result.insertId);
};

const getUserByEmail = async (email) => {
  const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
};

const getUserByIdWithPassword = async (id) => {
  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

const updateUser = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    avatar_url: data.avatarUrl,
    password_hash: data.passwordHash,
    status: data.status,
    balance: data.balance,
    address: data.address
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined && value !== null)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getUserById(id);
  }

  const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getUserById(id);
};

const deleteUser = async (id) => {
  await execute('DELETE FROM users WHERE id = ?', [id]);
};

const getUserOrdersStats = async (userId) => {
  // This would typically query orders table grouped by type
  // For now, return placeholder
  return { total: 0, courses: 0, workflows: 0, vps: 0 };
};

const getUserStats = async () => {
  const [totalRows] = await query('SELECT COUNT(*) as total FROM users');
  const [activeRows] = await query("SELECT COUNT(*) as total FROM users WHERE status = 'active'");
  const [lockedRows] = await query("SELECT COUNT(*) as total FROM users WHERE status = 'locked'");
  
  return {
    total: totalRows?.total || 0,
    active: activeRows?.total || 0,
    locked: lockedRows?.total || 0
  };
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByIdWithPassword,
  updateUser,
  listUsers,
  countUsers,
  deleteUser,
  getUserOrdersStats,
  getUserStats
};

