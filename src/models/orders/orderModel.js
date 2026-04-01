const { query, execute } = require('../../config/database');

const createOrder = async ({ userId, type, itemId, amount, paymentMethod, status }) => {
  const sql = `
    INSERT INTO orders (user_id, type, item_id, amount, payment_method, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [userId, type, itemId, amount, paymentMethod, status]);
  return getOrderById(result.insertId);
};

const getOrderById = async (id) => {
  const rows = await query('SELECT * FROM orders WHERE id = ?', [id]);
  return rows[0] || null;
};

const listOrders = async ({ userId, type, status, itemId, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push('user_id = ?');
    params.push(userId);
  }

  if (itemId) {
    clauses.push('item_id = ?');
    params.push(itemId);
  }

  if (type) {
    if (Array.isArray(type)) {
      if (type.length > 0) {
        clauses.push(`type IN (${type.map(() => '?').join(', ')})`);
        params.push(...type);
      }
    } else {
      clauses.push('type = ?');
      params.push(type);
    }
  }

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return query(sql, params);
};

const countOrders = async ({ userId, type, status }) => {
  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push('user_id = ?');
    params.push(userId);
  }

  if (type) {
    if (Array.isArray(type)) {
      if (type.length > 0) {
        clauses.push(`type IN (${type.map(() => '?').join(', ')})`);
        params.push(...type);
      }
    } else {
      clauses.push('type = ?');
      params.push(type);
    }
  }

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(`SELECT COUNT(*) as total FROM orders ${where}`, params);
  return rows[0]?.total || 0;
};

const updateOrder = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    status: data.status,
    payment_method: data.paymentMethod,
    download_link: data.downloadLink
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined && value !== null)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getOrderById(id);
  }

  const sql = `UPDATE orders SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getOrderById(id);
};

const deleteAllOrders = async () => {
  const sql = 'DELETE FROM orders';
  return execute(sql);
};

module.exports = {
  createOrder,
  getOrderById,
  listOrders,
  countOrders,
  updateOrder,
  deleteAllOrders
};













