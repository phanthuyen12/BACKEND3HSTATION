const { query, execute } = require('../../config/database');

const createToolKey = async ({ user_id, package_id, key_token, expires_at, status = 'active' }) => {
  const sql = `
    INSERT INTO tool_keys (user_id, package_id, key_token, expires_at, status)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [user_id, package_id, key_token, expires_at, status]);
  return getToolKeyById(result.insertId);
};

const getToolKeyById = async (id) => {
  const sql = `
    SELECT tk.*, tp.name AS package_name, u.email AS user_email, u.name AS user_name
    FROM tool_keys tk
    JOIN tool_packages tp ON tk.package_id = tp.id
    JOIN users u ON tk.user_id = u.id
    WHERE tk.id = ?
  `;
  const [row] = await query(sql, [id]);
  return parseJsonFields(row);
};

const getToolKeyByToken = async (key_token) => {
  const sql = `
    SELECT tk.*, tp.name AS package_name
    FROM tool_keys tk
    JOIN tool_packages tp ON tk.package_id = tp.id
    WHERE tk.key_token = ?
  `;
  const [row] = await query(sql, [key_token]);
  return parseJsonFields(row);
};

const getUserToolKeys = async (user_id) => {
  const sql = `
    SELECT tk.*, tp.name AS package_name
    FROM tool_keys tk
    JOIN tool_packages tp ON tk.package_id = tp.id
    WHERE tk.user_id = ?
    ORDER BY tk.created_at DESC
  `;
  const rows = await query(sql, [user_id]);
  return rows.map(parseJsonFields);
};

const activateToolKey = async (id, { machine_id, machine_info }) => {
  const sql = `
    UPDATE tool_keys 
    SET machine_id = ?, machine_info = ?, activated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  await execute(sql, [machine_id, JSON.stringify(machine_info), id]);
  return getToolKeyById(id);
};

const renewToolKey = async (id, new_expires_at) => {
  const sql = `
    UPDATE tool_keys 
    SET expires_at = ?, status = 'active'
    WHERE id = ?
  `;
  await execute(sql, [new_expires_at, id]);
  return getToolKeyById(id);
};

const updateToolKeyStatus = async (id, status) => {
  const sql = 'UPDATE tool_keys SET status = ? WHERE id = ?';
  await execute(sql, [status, id]);
  return getToolKeyById(id);
};

const getAllToolKeys = async () => {
  const sql = `
    SELECT tk.*, tp.name AS package_name, u.email AS user_email, u.name AS user_name
    FROM tool_keys tk
    JOIN tool_packages tp ON tk.package_id = tp.id
    JOIN users u ON tk.user_id = u.id
    ORDER BY tk.created_at DESC
  `;
  const rows = await query(sql);
  return rows.map(parseJsonFields);
};

const parseJsonFields = (row) => {
  if (!row) return row;
  if (row.machine_info && typeof row.machine_info === 'string') {
    try {
      row.machine_info = JSON.parse(row.machine_info);
    } catch (e) {
      // Keep as is
    }
  }
  return row;
};

module.exports = {
  createToolKey,
  getToolKeyById,
  getToolKeyByToken,
  getUserToolKeys,
  activateToolKey,
  renewToolKey,
  updateToolKeyStatus,
  getAllToolKeys
};
