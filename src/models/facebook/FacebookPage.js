// src/models/facebook/FacebookPage.js
// Represents the `facebook_pages` table.

const { query, execute } = require('../../config/database');
const { encrypt, decrypt } = require('../../utils/encryption');

// Helper to map DB row to JS object (decrypt token)
function mapRow(row) {
  return {
    id: row.id,
    pageId: row.page_id,
    pageName: row.page_name,
    avatarUrl: row.avatar_url,
    accessToken: row.access_token ? decrypt(row.access_token) : null,
    tokenExpiresAt: row.token_expires_at,
    connectedByUserId: row.connected_by_user_id,
    status: row.status,
    difyApiKey: row.dify_api_key,
    difyApiUrl: row.dify_api_url,
    aiEnabled: row.ai_enabled,
    salesEngineEnabled: row.sales_engine_enabled,
    followUpMessage: row.follow_up_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createPage({ pageId, pageName, avatarUrl, accessToken, tokenExpiresAt, connectedByUserId, status = 'connected' }) {
  const encryptedToken = accessToken ? encrypt(accessToken) : null;
  const sql = `INSERT INTO facebook_pages 
    (page_id, page_name, avatar_url, access_token, token_expires_at, connected_by_user_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await execute(sql, [pageId, pageName, avatarUrl, encryptedToken, tokenExpiresAt, connectedByUserId, status]);
  return getById(result.insertId);
}

async function getById(id) {
  const rows = await query('SELECT * FROM facebook_pages WHERE id = ?', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function getByPageId(pageId) {
  const rows = await query('SELECT * FROM facebook_pages WHERE page_id = ?', [pageId]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function listAll() {
  const rows = await query('SELECT * FROM facebook_pages');
  return rows.map(mapRow);
}

async function updateStatus(id, status) {
  const sql = 'UPDATE facebook_pages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  await execute(sql, [status, id]);
  return getById(id);
}

async function updateAiConfig(id, { difyApiKey, difyApiUrl, aiEnabled, salesEngineEnabled, followUpMessage }) {
  const sql = `UPDATE facebook_pages SET 
    dify_api_key = ?, 
    dify_api_url = ?, 
    ai_enabled = ?, 
    sales_engine_enabled = ?, 
    follow_up_message = ?, 
    updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?`;
  await execute(sql, [difyApiKey, difyApiUrl, aiEnabled, salesEngineEnabled, followUpMessage, id]);
  return getById(id);
}

async function updateConnection(id, { accessToken, tokenExpiresAt, status = 'connected', pageName, avatarUrl }) {
  const encryptedToken = accessToken ? encrypt(accessToken) : null;
  const sql = `UPDATE facebook_pages SET 
    access_token = ?, 
    token_expires_at = ?, 
    status = ?, 
    page_name = ?,
    avatar_url = ?,
    updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?`;
  await execute(sql, [encryptedToken, tokenExpiresAt, status, pageName, avatarUrl, id]);
  return getById(id);
}

async function deleteById(id) {
  const sql = 'DELETE FROM facebook_pages WHERE id = ?';
  await execute(sql, [id]);
}

module.exports = {
  createPage,
  getById,
  getByPageId,
  listAll,
  updateStatus,
  updateAiConfig,
  deleteById,
  updateConnection,
};

