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

const listOrders = async ({ userId, type, status, itemId, limit, offset, search }) => {
  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push('o.user_id = ?');
    params.push(userId);
  }

  if (itemId) {
    clauses.push('o.item_id = ?');
    params.push(itemId);
  }

  if (type) {
    if (Array.isArray(type)) {
      if (type.length > 0) {
        clauses.push(`o.type IN (${type.map(() => '?').join(', ')})`);
        params.push(...type);
      }
    } else {
      clauses.push('o.type = ?');
      params.push(type);
    }
  }

  if (status) {
    clauses.push('o.status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(o.id LIKE ? OR u.email LIKE ? OR u.name LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT o.* FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ${where} 
    ORDER BY o.created_at DESC 
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  return query(sql, params);
};

const countOrders = async ({ userId, type, status, search }) => {
  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push('o.user_id = ?');
    params.push(userId);
  }

  if (type) {
    if (Array.isArray(type)) {
      if (type.length > 0) {
        clauses.push(`o.type IN (${type.map(() => '?').join(', ')})`);
        params.push(...type);
      }
    } else {
      clauses.push('o.type = ?');
      params.push(type);
    }
  }

  if (status) {
    clauses.push('o.status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(o.id LIKE ? OR u.email LIKE ? OR u.name LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT COUNT(*) as total 
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ${where}
  `;
  const rows = await query(sql, params);
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

module.exports = {
  createOrder,
  getOrderById,
  listOrders,
  countOrders,
  updateOrder
};













