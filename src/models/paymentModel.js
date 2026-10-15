const { query, execute } = require('../config/database');

const serializeMetadata = (metadata) => {
  if (metadata === undefined || metadata === null) return null;
  return typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
};

const parseMetadata = (row) => {
  if (!row) return row;
  if (row.metadata) {
    try {
      row.metadata = JSON.parse(row.metadata);
    } catch (error) {
      // leave metadata as-is if parsing fails
    }
  }
  return row;
};

const createPayment = async ({ userId, courseId, price, method, status = 'pending', metadata = null }) => {
  const sql = `
    INSERT INTO payments (user_id, course_id, price, method, status, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [
    userId,
    courseId,
    price,
    method,
    status,
    serializeMetadata(metadata)
  ]);
  return getPaymentById(result.insertId);
};

const updatePaymentStatus = async (id, status, metadata = null) => {
  await execute(
    'UPDATE payments SET status = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, serializeMetadata(metadata), id]
  );
  return getPaymentById(id);
};

const getPaymentById = async (id) => {
  const sql = `
    SELECT
      p.id,
      p.user_id,
      p.course_id,
      p.price,
      p.method,
      p.status,
      p.metadata,
      p.created_at,
      p.updated_at,
      c.title AS course_title
    FROM payments p
    LEFT JOIN courses c ON p.course_id = c.id
    WHERE p.id = ?
  `;
  const rows = await query(sql, [id]);
  return parseMetadata(rows[0] || null);
};

const getUserPayments = async (userId) => {
  const sql = `
    SELECT
      p.id,
      p.course_id,
      p.price,
      p.method,
      p.status,
      p.metadata,
      p.created_at,
      c.title AS course_title
    FROM payments p
    LEFT JOIN courses c ON p.course_id = c.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `;
  const rows = await query(sql, [userId]);
  return rows.map((row) => parseMetadata(row));
};

module.exports = {
  createPayment,
  updatePaymentStatus,
  getPaymentById,
  getUserPayments
};

