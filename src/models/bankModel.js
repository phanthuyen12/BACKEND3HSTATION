const { query, execute } = require('../config/database');

const listBanks = async ({ status, search }) => {
  const clauses = [];
  const params = [];

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(name LIKE ? OR account_number LIKE ? OR account_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT * FROM banks ${where} ORDER BY created_at DESC`;
  return query(sql, params);
};

const countBanks = async ({ status, search }) => {
  const clauses = [];
  const params = [];

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(name LIKE ? OR account_number LIKE ? OR account_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(`SELECT COUNT(*) as total FROM banks ${where}`, params);
  return rows[0]?.total || 0;
};

const getBankById = async (id) => {
  const rows = await query('SELECT * FROM banks WHERE id = ?', [id]);
  return rows[0] || null;
};

const createBank = async ({ name, accountNumber, accountName, branch, status = 'active' }) => {
  const sql = `
    INSERT INTO banks (name, account_number, account_name, branch, status)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [name, accountNumber, accountName, branch || null, status]);
  return getBankById(result.insertId);
};

const updateBank = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    name: data.name,
    account_number: data.accountNumber,
    account_name: data.accountName,
    branch: data.branch,
    status: data.status
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getBankById(id);
  }

  const sql = `UPDATE banks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getBankById(id);
};

const deleteBank = async (id) => {
  await execute('DELETE FROM banks WHERE id = ?', [id]);
};

module.exports = {
  listBanks,
  countBanks,
  getBankById,
  createBank,
  updateBank,
  deleteBank
};

