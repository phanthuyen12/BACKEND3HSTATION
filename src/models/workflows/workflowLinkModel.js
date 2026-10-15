const { query, execute } = require('../../config/database');

const createLink = async ({ workflowId, downloadLink }) => {
  const sql = `
    INSERT INTO workflow_links (workflow_id, download_link, status)
    VALUES (?, ?, 'chua-ban')
  `;
  const [result] = await execute(sql, [workflowId, downloadLink]);
  return getLinkById(result.insertId);
};

const createLinksBulk = async ({ workflowId, links }) => {
  if (!links || links.length === 0) {
    return [];
  }
  
  const values = links.map(() => '(?, ?, "chua-ban")').join(', ');
  const sql = `
    INSERT INTO workflow_links (workflow_id, download_link, status)
    VALUES ${values}
  `;
  
  const params = links.flatMap(link => [workflowId, link.trim()]);
  await execute(sql, params);
  
  // Lấy lại các links vừa tạo
  return listLinksByWorkflow(workflowId);
};

const getLinkById = async (id) => {
  const rows = await query('SELECT * FROM workflow_links WHERE id = ?', [id]);
  return rows[0] || null;
};

const listLinksByWorkflow = async (workflowId, { status = null } = {}) => {
  const clauses = ['workflow_id = ?'];
  const params = [workflowId];
  
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  
  const sql = `
    SELECT * FROM workflow_links 
    WHERE ${clauses.join(' AND ')}
    ORDER BY created_at DESC
  `;
  return query(sql, params);
};

const getAvailableLink = async (workflowId) => {
  const sql = `
    SELECT * FROM workflow_links 
    WHERE workflow_id = ? AND status = 'chua-ban'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE
  `;
  const rows = await query(sql, [workflowId]);
  return rows[0] || null;
};

const assignLinkToOrder = async (linkId, orderId, userId) => {
  const sql = `
    UPDATE workflow_links 
    SET status = 'da-ban', order_id = ?, user_id = ?, assigned_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  await execute(sql, [orderId, userId, linkId]);
  return getLinkById(linkId);
};

const getLinkByOrderId = async (orderId) => {
  const rows = await query('SELECT * FROM workflow_links WHERE order_id = ? LIMIT 1', [orderId]);
  return rows[0] || null;
};

const deleteLink = async (id) => {
  await execute('DELETE FROM workflow_links WHERE id = ?', [id]);
};

const updateLink = async (id, { downloadLink, status }) => {
  const fields = [];
  const values = [];
  
  if (downloadLink !== undefined) {
    fields.push('download_link = ?');
    values.push(downloadLink);
  }
  
  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }
  
  if (fields.length === 0) {
    return getLinkById(id);
  }
  
  const sql = `UPDATE workflow_links SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  values.push(id);
  await execute(sql, values);
  return getLinkById(id);
};

module.exports = {
  createLink,
  createLinksBulk,
  getLinkById,
  listLinksByWorkflow,
  getAvailableLink,
  assignLinkToOrder,
  getLinkByOrderId,
  deleteLink,
  updateLink
};


