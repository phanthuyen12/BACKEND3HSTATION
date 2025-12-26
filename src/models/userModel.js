const { query, execute } = require('../config/database');

const getUserById = async (id) => {
  const rows = await query(
    'SELECT id, name, email, phone, avatar_url, role, balance, status, address, ref_code, ref_by, ref_count, ref_commission, created_at, updated_at, last_login_at FROM users WHERE id = ?',
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
    SELECT id, name, email, phone, balance, status, ref_code, ref_by, ref_count, ref_commission, created_at, updated_at, last_login_at 
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

const createUser = async ({ name, email, passwordHash, avatarUrl = null, role = 'user', phone = null, status = 'active', refCode = null, refBy = null }) => {
  const sql = `
    INSERT INTO users (name, email, password_hash, avatar_url, role, phone, status, ref_code, ref_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [name, email, passwordHash, avatarUrl, role, phone, status, refCode, refBy]);
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
    address: data.address,
    ref_code: data.refCode,
    ref_by: data.refBy,
    ref_count: data.refCount,
    ref_commission: data.refCommission
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

const getUserByRefCode = async (refCode) => {
  if (!refCode) return null;
  // Tìm kiếm case-insensitive và trim whitespace
  const refCodeTrimmed = String(refCode).trim();
  const rows = await query('SELECT * FROM users WHERE ref_code = ? LIMIT 1', [refCodeTrimmed]);
  if (rows.length > 0) {
    return rows[0];
  }
  // Fallback: tìm kiếm case-insensitive nếu không tìm thấy exact match
  const rowsCaseInsensitive = await query('SELECT * FROM users WHERE UPPER(ref_code) = UPPER(?) LIMIT 1', [refCodeTrimmed]);
  return rowsCaseInsensitive[0] || null;
};

const incrementRefCount = async (userId) => {
  const userIdInt = parseInt(userId, 10);
  if (!userIdInt || isNaN(userIdInt)) {
    throw new Error(`Invalid userId for incrementRefCount: ${userId}`);
  }
  
  const sql = `
    UPDATE users 
    SET ref_count = IFNULL(ref_count, 0) + 1
    WHERE id = ?
  `;
  const result = await execute(sql, [userIdInt]);
  console.log('[incrementRefCount] Updated rows:', result.affectedRows, 'for userId:', userIdInt);
  return getUserById(userIdInt);
};

const incrementRefCountAndCommission = async (userId, commissionAmount) => {
  const sql = `
    UPDATE users 
    SET 
      ref_count = IFNULL(ref_count, 0) + 1,
      ref_commission = IFNULL(ref_commission, 0) + ?,
      balance = IFNULL(balance, 0) + ?
    WHERE id = ?
  `;
  await execute(sql, [commissionAmount, commissionAmount, userId]);
  return getUserById(userId);
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
  getUserStats,
  getUserByRefCode,
  incrementRefCount,
  incrementRefCountAndCommission
};

