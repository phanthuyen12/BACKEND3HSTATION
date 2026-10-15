// src/models/facebook/FacebookLead.js
const { query, execute } = require('../../config/database');

function mapRow(row) {
  return {
    id: row.id,
    pageId: row.page_id,
    facebookUserId: row.facebook_user_id,
    difyConversationId: row.dify_conversation_id,
    leadStatus: row.lead_status,
    aiEnabled: row.ai_enabled,
    notes: row.notes,
    phone: row.phone,
    courseInterest: row.course_interest,
    currentIntent: row.current_intent,
    currentStage: row.current_stage,
    lastQuestionAsked: row.last_question_asked,
    sessionMemory: row.session_memory,
    tags: row.tags,
    saleAgent: row.sale_agent,
    lastMessageSender: row.last_message_sender,
    lastMessageAt: row.last_message_at,
    followUpSent: row.follow_up_sent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createLead({
  pageId,
  facebookUserId,
  difyConversationId = null,
  leadStatus = 'new_lead',
  aiEnabled = 1,
  notes = null,
  phone = null,
  courseInterest = null,
  currentIntent = null,
  currentStage = null,
  lastQuestionAsked = null,
  sessionMemory = null,
  tags = null,
  saleAgent = null
}) {
  const sql = `INSERT INTO facebook_leads 
    (page_id, facebook_user_id, dify_conversation_id, lead_status, ai_enabled, notes, phone, course_interest, current_intent, current_stage, last_question_asked, session_memory, tags, sale_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await execute(sql, [
    pageId,
    facebookUserId,
    difyConversationId,
    leadStatus,
    aiEnabled,
    notes,
    phone,
    courseInterest,
    currentIntent,
    currentStage,
    lastQuestionAsked,
    sessionMemory,
    tags,
    saleAgent
  ]);
  return getById(result.insertId);
}

async function getById(id) {
  const rows = await query('SELECT * FROM facebook_leads WHERE id = ?', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function getByPageAndUser(pageId, facebookUserId) {
  const rows = await query('SELECT * FROM facebook_leads WHERE page_id = ? AND facebook_user_id = ?', [pageId, facebookUserId]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function updateLead(id, updates) {
  const fields = [];
  const params = [];
  
  for (const [key, val] of Object.entries(updates)) {
    // Map camelCase fields to snake_case column names
    let columnName = key;
    if (key === 'difyConversationId') columnName = 'dify_conversation_id';
    else if (key === 'leadStatus') columnName = 'lead_status';
    else if (key === 'aiEnabled') columnName = 'ai_enabled';
    else if (key === 'courseInterest') columnName = 'course_interest';
    else if (key === 'currentIntent') columnName = 'current_intent';
    else if (key === 'currentStage') columnName = 'current_stage';
    else if (key === 'lastQuestionAsked') columnName = 'last_question_asked';
    else if (key === 'sessionMemory') columnName = 'session_memory';
    else if (key === 'lastMessageSender') columnName = 'last_message_sender';
    else if (key === 'lastMessageAt') columnName = 'last_message_at';
    else if (key === 'followUpSent') columnName = 'follow_up_sent';
    else if (key === 'saleAgent') columnName = 'sale_agent';
    
    fields.push(`${columnName} = ?`);
    params.push(val);
  }
  
  if (fields.length === 0) return getById(id);
  
  params.push(id);
  const sql = `UPDATE facebook_leads SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  await execute(sql, params);
  return getById(id);
}

async function listLeads({ pageId, leadStatus, aiEnabled, search, limit = 50, offset = 0 } = {}) {
  let sql = 'SELECT * FROM facebook_leads WHERE 1=1';
  const params = [];
  
  if (pageId) {
    sql += ' AND page_id = ?';
    params.push(pageId);
  }
  if (leadStatus) {
    sql += ' AND lead_status = ?';
    params.push(leadStatus);
  }
  if (aiEnabled !== undefined && aiEnabled !== null) {
    sql += ' AND ai_enabled = ?';
    params.push(aiEnabled);
  }
  if (search) {
    sql += ' AND (facebook_user_id LIKE ? OR phone LIKE ? OR notes LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }
  
  sql += ' ORDER BY last_message_at DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  
  const rows = await query(sql, params);
  return rows.map(mapRow);
}

module.exports = {
  createLead,
  getById,
  getByPageAndUser,
  updateLead,
  listLeads,
};
