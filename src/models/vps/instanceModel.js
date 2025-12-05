const { query, execute } = require('../../config/database');

const listInstances = async ({ userId, status, search, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push('vi.user_id = ?');
    params.push(userId);
  }

  if (status) {
    clauses.push('vi.status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(vi.hostname LIKE ? OR vi.ip_address LIKE ? OR vp.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT 
      vi.id,
      vi.user_id,
      vi.order_id,
      vi.plan_id,
      vi.status,
      vi.ip_address,
      vi.hostname,
      vi.expires_at,
      vi.configuration,
      vi.notes,
      vi.created_at,
      vi.updated_at,
      vp.name AS plan_name,
      vp.cpu,
      vp.ram,
      vp.ssd,
      vp.bandwidth,
      u.name AS user_name,
      u.email AS user_email
    FROM vps_instances vi
    INNER JOIN vps_plans vp ON vi.plan_id = vp.id
    INNER JOIN users u ON vi.user_id = u.id
    ${where}
    ORDER BY vi.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  return query(sql, params);
};

const countInstances = async ({ userId, status, search }) => {
  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push('vi.user_id = ?');
    params.push(userId);
  }

  if (status) {
    clauses.push('vi.status = ?');
    params.push(status);
  }

  if (search) {
    clauses.push('(vi.hostname LIKE ? OR vi.ip_address LIKE ? OR vp.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(
    `SELECT COUNT(*) as total FROM vps_instances vi 
     INNER JOIN vps_plans vp ON vi.plan_id = vp.id 
     ${where}`,
    params
  );
  return rows[0]?.total || 0;
};

const getInstanceById = async (id) => {
  const sql = `
    SELECT 
      vi.*,
      vp.name AS plan_name,
      vp.cpu,
      vp.ram,
      vp.ssd,
      vp.bandwidth,
      u.name AS user_name,
      u.email AS user_email
    FROM vps_instances vi
    INNER JOIN vps_plans vp ON vi.plan_id = vp.id
    INNER JOIN users u ON vi.user_id = u.id
    WHERE vi.id = ?
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
};

const getInstanceByOrderId = async (orderId) => {
  const sql = `
    SELECT 
      vi.*,
      vp.name AS plan_name,
      vp.cpu,
      vp.ram,
      vp.ssd,
      vp.bandwidth,
      u.name AS user_name,
      u.email AS user_email
    FROM vps_instances vi
    INNER JOIN vps_plans vp ON vi.plan_id = vp.id
    INNER JOIN users u ON vi.user_id = u.id
    WHERE vi.order_id = ?
  `;
  const rows = await query(sql, [orderId]);
  return rows[0] || null;
};

const createInstance = async ({ userId, orderId, planId, status = 'pending', configuration = null }) => {
  const sql = `
    INSERT INTO vps_instances (user_id, order_id, plan_id, status, configuration)
    VALUES (?, ?, ?, ?, ?)
  `;
  const configJson = configuration ? JSON.stringify(configuration) : null;
  const [result] = await execute(sql, [userId, orderId, planId, status, configJson]);
  return getInstanceById(result.insertId);
};

const updateInstance = async (id, data) => {
  const fields = [];
  const values = [];

  const mapping = {
    status: data.status,
    ip_address: data.ipAddress,
    hostname: data.hostname,
    expires_at: data.expiresAt,
    configuration: data.configuration ? JSON.stringify(data.configuration) : undefined,
    notes: data.notes
  };

  Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .forEach(([column, value]) => {
      fields.push(`${column} = ?`);
      values.push(value);
    });

  if (!fields.length) {
    return getInstanceById(id);
  }

  const sql = `UPDATE vps_instances SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getInstanceById(id);
};

const deleteInstance = async (id) => {
  await execute('DELETE FROM vps_instances WHERE id = ?', [id]);
};

module.exports = {
  listInstances,
  countInstances,
  getInstanceById,
  getInstanceByOrderId,
  createInstance,
  updateInstance,
  deleteInstance
};

