// src/models/facebook/FacebookChatLog.js
const { query, execute } = require('../../config/database');

function mapRow(row) {
  return {
    id: row.id,
    pageId: row.page_id,
    facebookUserId: row.facebook_user_id,
    messageUser: row.message_user,
    messageBot: row.message_bot,
    messageAdmin: row.message_admin,
    difyConversationId: row.dify_conversation_id,
    leadStatus: row.lead_status,
    createdAt: row.created_at,
  };
}

async function createLog({ pageId, facebookUserId, messageUser = null, messageBot = null, messageAdmin = null, difyConversationId = null, leadStatus = null }) {
  const sql = `INSERT INTO facebook_chat_logs 
    (page_id, facebook_user_id, message_user, message_bot, message_admin, dify_conversation_id, lead_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await execute(sql, [pageId, facebookUserId, messageUser, messageBot, messageAdmin, difyConversationId, leadStatus]);
  return getById(result.insertId);
}

async function getById(id) {
  const rows = await query('SELECT * FROM facebook_chat_logs WHERE id = ?', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function listChatHistory(pageId, facebookUserId, { limit = 100, offset = 0 } = {}) {
  const sql = `SELECT * FROM facebook_chat_logs 
    WHERE page_id = ? AND facebook_user_id = ? 
    ORDER BY created_at ASC 
    LIMIT ? OFFSET ?`;
  const rows = await query(sql, [pageId, facebookUserId, Number(limit), Number(offset)]);
  return rows.map(mapRow);
}

async function listRecentChatHistory(pageId, facebookUserId, { limit = 6 } = {}) {
  const sql = `SELECT * FROM (
      SELECT *
      FROM facebook_chat_logs
      WHERE page_id = ? AND facebook_user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    ) recent_logs
    ORDER BY created_at ASC, id ASC`;
  const rows = await query(sql, [pageId, facebookUserId, Number(limit)]);
  return rows.map(mapRow);
}

module.exports = {
  createLog,
  getById,
  listChatHistory,
  listRecentChatHistory,
};
