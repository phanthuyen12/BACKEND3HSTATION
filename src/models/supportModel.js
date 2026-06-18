const { query, execute } = require('../config/database');

const createSupportRequest = async ({ name, email, topic, message, sourcePage }) => {
  const [result] = await execute(
    `
      INSERT INTO support_requests (name, email, topic, message, source_page)
      VALUES (?, ?, ?, ?, ?)
    `,
    [name, email, topic, message, sourcePage || 'landing-contact']
  );

  const rows = await query('SELECT * FROM support_requests WHERE id = ?', [result.insertId]);
  return rows[0] || null;
};

const buildWhereClause = ({ status, search, sourcePage }) => {
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (sourcePage) {
    conditions.push('source_page = ?');
    params.push(sourcePage);
  }

  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ? OR topic LIKE ? OR message LIKE ?)');
    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};

const listSupportRequests = async ({ status, search, sourcePage, limit = 20, offset = 0 }) => {
  const { whereSql, params } = buildWhereClause({ status, search, sourcePage });

  return query(
    `
      SELECT *
      FROM support_requests
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, Number(limit), Number(offset)]
  );
};

const countSupportRequests = async ({ status, search, sourcePage }) => {
  const { whereSql, params } = buildWhereClause({ status, search, sourcePage });

  const rows = await query(
    `
      SELECT COUNT(*) AS total
      FROM support_requests
      ${whereSql}
    `,
    params
  );

  return Number(rows[0]?.total || 0);
};

const getSupportRequestById = async (id) => {
  const rows = await query('SELECT * FROM support_requests WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

const updateSupportRequestStatus = async (id, status) => {
  await execute(
    `
      UPDATE support_requests
      SET status = ?
      WHERE id = ?
    `,
    [status, id]
  );

  return getSupportRequestById(id);
};

const getSupportRequestStats = async () => {
  const rows = await query(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS total_new,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) AS total_reviewing,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS total_resolved
      FROM support_requests
    `
  );

  return rows[0] || {
    total: 0,
    total_new: 0,
    total_reviewing: 0,
    total_resolved: 0
  };
};

module.exports = {
  createSupportRequest,
  listSupportRequests,
  countSupportRequests,
  getSupportRequestById,
  updateSupportRequestStatus,
  getSupportRequestStats
};
