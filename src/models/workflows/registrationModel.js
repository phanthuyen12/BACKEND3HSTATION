const { query, execute } = require('../../config/database');

const listRegistrations = async ({ workflowId, status, search, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (workflowId) {
    clauses.push('wr.workflow_id = ?');
    params.push(workflowId);
  }

  if (status) {
    clauses.push('wr.status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(u.name LIKE ? OR u.email LIKE ? OR w.name LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  
  const sql = `
    SELECT 
      wr.id,
      wr.user_id,
      wr.workflow_id,
      wr.status,
      wr.reason,
      wr.created_at,
      wr.updated_at,
      u.name AS user_name,
      u.email AS user_email,
      w.name AS workflow_name,
      wc.name AS category_name
    FROM workflow_registrations wr
    INNER JOIN users u ON wr.user_id = u.id
    INNER JOIN workflows w ON wr.workflow_id = w.id
    LEFT JOIN workflow_categories wc ON w.category_id = wc.id
    ${where}
    ORDER BY wr.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  return query(sql, params);
};

const countRegistrations = async ({ workflowId, status, search }) => {
  const clauses = [];
  const params = [];

  if (workflowId) {
    clauses.push('wr.workflow_id = ?');
    params.push(workflowId);
  }

  if (status) {
    clauses.push('wr.status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(u.name LIKE ? OR u.email LIKE ? OR w.name LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  
  const sql = `
    SELECT COUNT(*) as total
    FROM workflow_registrations wr
    INNER JOIN users u ON wr.user_id = u.id
    INNER JOIN workflows w ON wr.workflow_id = w.id
    ${where}
  `;
  const rows = await query(sql, params);
  return rows[0]?.total || 0;
};

const getRegistrationById = async (id) => {
  const sql = `
    SELECT 
      wr.id,
      wr.user_id,
      wr.workflow_id,
      wr.status,
      wr.reason,
      wr.created_at,
      wr.updated_at,
      u.name AS user_name,
      u.email AS user_email,
      w.name AS workflow_name,
      wc.name AS category_name
    FROM workflow_registrations wr
    INNER JOIN users u ON wr.user_id = u.id
    INNER JOIN workflows w ON wr.workflow_id = w.id
    LEFT JOIN workflow_categories wc ON w.category_id = wc.id
    WHERE wr.id = ?
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
};

const createRegistration = async ({ userId, workflowId }) => {
  const sql = `
    INSERT INTO workflow_registrations (user_id, workflow_id, status)
    VALUES (?, ?, 'da-duyet')
    ON DUPLICATE KEY UPDATE
      status = 'da-duyet',
      reason = NULL,
      updated_at = CURRENT_TIMESTAMP
  `;
  const [result] = await execute(sql, [userId, workflowId]);
  
  // If it was an update (result.insertId is 0), get the existing registration
  if (result.insertId === 0) {
    const rows = await query(
      'SELECT id FROM workflow_registrations WHERE user_id = ? AND workflow_id = ?',
      [userId, workflowId]
    );
    return getRegistrationById(rows[0].id);
  }
  
  return getRegistrationById(result.insertId);
};

const updateRegistrationStatus = async (id, status, reason = null) => {
  const sql = `
    UPDATE workflow_registrations 
    SET status = ?, reason = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;
  await execute(sql, [status, reason, id]);
  return getRegistrationById(id);
};

const deleteRegistration = async (id) => {
  await execute('DELETE FROM workflow_registrations WHERE id = ?', [id]);
};

const getRegistrationStats = async () => {
  const sql = `
    SELECT 
      status,
      COUNT(*) as count
    FROM workflow_registrations
    GROUP BY status
  `;
  const rows = await query(sql);
  
  const stats = {
    totalRegistrations: 0,
    totalWaiting: 0,
    totalApproved: 0,
    totalRejected: 0
  };
  
  rows.forEach(row => {
    stats.totalRegistrations += row.count;
    if (row.status === 'cho-duyet') stats.totalWaiting = row.count;
    if (row.status === 'da-duyet') stats.totalApproved = row.count;
    if (row.status === 'da-huy') stats.totalRejected = row.count;
  });
  
  return stats;
};

module.exports = {
  listRegistrations,
  countRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistrationStatus,
  deleteRegistration,
  getRegistrationStats
};



