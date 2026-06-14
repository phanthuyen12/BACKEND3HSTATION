const { query, execute } = require('../config/database');

const createContact = async ({ name, phone, interest }) => {
  const sql = `
    INSERT INTO contacts (name, phone, interest, status)
    VALUES (?, ?, ?, 'pending')
  `;
  const [result] = await execute(sql, [name, phone, interest]);
  return getContactById(result.insertId);
};

const getContactById = async (id) => {
  const rows = await query('SELECT * FROM contacts WHERE id = ?', [id]);
  return rows[0] || null;
};

const listContacts = async ({ page = 1, limit = 20, status, startDate, endDate }) => {
  const parsedLimit = Math.max(1, parseInt(limit) || 20);
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const offset = (parsedPage - 1) * parsedLimit;

  const clauses = [];
  const params = [];

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  
  if (startDate) {
    clauses.push('DATE(created_at) >= ?');
    params.push(startDate);
  }
  
  if (endDate) {
    clauses.push('DATE(created_at) <= ?');
    params.push(endDate);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT * FROM contacts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const rows = await query(sql, [...params, parsedLimit, offset]);

  const countSql = `SELECT COUNT(*) as total FROM contacts ${where}`;
  const countRows = await query(countSql, params);

  return {
    data: rows,
    total: countRows[0]?.total || 0,
    page: parsedPage,
    limit: parsedLimit,
  };
};

const updateContactStatus = async (id, status) => {
  const sql = `UPDATE contacts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  await execute(sql, [status, id]);
  return getContactById(id);
};

module.exports = {
  createContact,
  getContactById,
  listContacts,
  updateContactStatus
};
