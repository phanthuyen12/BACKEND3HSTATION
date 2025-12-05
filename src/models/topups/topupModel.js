const { query, execute } = require('../../config/database');

const listTopups = async ({ userId, status, topupStatus, search, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push('t.user_id = ?');
    params.push(userId);
  }

  if (status) {
    clauses.push('t.status = ?');
    params.push(status);
  }

  if (topupStatus) {
    clauses.push('t.topup_status = ?');
    params.push(topupStatus);
  }

  if (search) {
    clauses.push('(t.code LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT 
      t.*,
      u.name AS user_name,
      u.email AS user_email
    FROM topups t
    INNER JOIN users u ON t.user_id = u.id
    ${where}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  return query(sql, params);
};

const countTopups = async ({ userId, status, topupStatus, search }) => {
  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push('user_id = ?');
    params.push(userId);
  }

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  if (topupStatus) {
    clauses.push('topup_status = ?');
    params.push(topupStatus);
  }

  if (search) {
    clauses.push('(code LIKE ? OR user_id IN (SELECT id FROM users WHERE name LIKE ? OR email LIKE ?))');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(`SELECT COUNT(*) as total FROM topups ${where}`, params);
  return rows[0]?.total || 0;
};

const getTopupByCode = async (code) => {
  const sql = `
    SELECT 
      t.*,
      u.name AS user_name,
      u.email AS user_email
    FROM topups t
    INNER JOIN users u ON t.user_id = u.id
    WHERE t.code = ?
  `;
  const rows = await query(sql, [code]);
  return rows[0] || null;
};

const createTopup = async ({ code, userId, amount, bank, accountNumber, accountName, expiresAt }) => {
  const sql = `
    INSERT INTO topups (code, user_id, amount, bank, account_number, account_name, topup_status, status, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'chua-thanh-toan', 'cho-duyet', ?)
  `;
  await execute(sql, [code, userId, amount, bank, accountNumber || null, accountName || null, expiresAt || null]);
  return getTopupByCode(code);
};

const updateTopup = async (code, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    amount: data.amount,
    bank: data.bank,
    account_number: data.accountNumber,
    account_name: data.accountName,
    topup_status: data.topupStatus,
    status: data.status,
    payment_proof: data.paymentProof,
    note: data.note,
    reason: data.reason,
    expires_at: data.expiresAt
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getTopupByCode(code);
  }

  const sql = `UPDATE topups SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE code = ?`;
  values.push(code);
  await execute(sql, values);
  return getTopupByCode(code);
};

const deleteTopup = async (code) => {
  await execute('DELETE FROM topups WHERE code = ?', [code]);
};

module.exports = {
  listTopups,
  countTopups,
  getTopupByCode,
  createTopup,
  updateTopup,
  deleteTopup
};

