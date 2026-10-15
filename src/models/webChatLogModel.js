const { query, execute } = require('../config/database');

const mapRow = (row) => ({
  id: Number(row.id),
  sessionId: row.session_id,
  topicId: row.topic_id,
  topicLabel: row.topic_label,
  sourcePage: row.source_page,
  role: row.role,
  eventType: row.event_type,
  message: row.message,
  difyConversationId: row.dify_conversation_id,
  contactName: row.contact_name,
  contactPhone: row.contact_phone,
  contactEmail: row.contact_email,
  metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
  createdAt: row.created_at
});

const createLog = async ({
  sessionId,
  topicId = null,
  topicLabel = null,
  sourcePage = null,
  role = 'user',
  eventType = 'message',
  message = null,
  difyConversationId = null,
  contactName = null,
  contactPhone = null,
  contactEmail = null,
  metadata = null
}) => {
  const [result] = await execute(
    `
      INSERT INTO web_chat_logs (
        session_id,
        topic_id,
        topic_label,
        source_page,
        role,
        event_type,
        message,
        dify_conversation_id,
        contact_name,
        contact_phone,
        contact_email,
        metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sessionId,
      topicId,
      topicLabel,
      sourcePage,
      role,
      eventType,
      message,
      difyConversationId,
      contactName,
      contactPhone,
      contactEmail,
      metadata ? JSON.stringify(metadata) : null
    ]
  );

  const rows = await query('SELECT * FROM web_chat_logs WHERE id = ?', [result.insertId]);
  return rows[0] ? mapRow(rows[0]) : null;
};

const buildWhereClause = ({ topicId, sessionId, role, eventType, search, sourcePage }) => {
  const conditions = [];
  const params = [];

  if (topicId) {
    conditions.push('topic_id = ?');
    params.push(topicId);
  }

  if (sessionId) {
    conditions.push('session_id = ?');
    params.push(sessionId);
  }

  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }

  if (eventType) {
    conditions.push('event_type = ?');
    params.push(eventType);
  }

  if (sourcePage) {
    conditions.push('source_page = ?');
    params.push(sourcePage);
  }

  if (search) {
    const keyword = `%${search}%`;
    conditions.push(`
      (
        session_id LIKE ?
        OR topic_label LIKE ?
        OR message LIKE ?
        OR contact_name LIKE ?
        OR contact_phone LIKE ?
        OR contact_email LIKE ?
      )
    `);
    params.push(keyword, keyword, keyword, keyword, keyword, keyword);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};

const listLogs = async ({ topicId, sessionId, role, eventType, search, sourcePage, limit = 50, offset = 0 }) => {
  const { whereSql, params } = buildWhereClause({ topicId, sessionId, role, eventType, search, sourcePage });

  const rows = await query(
    `
      SELECT *
      FROM web_chat_logs
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, Number(limit), Number(offset)]
  );

  return rows.map(mapRow);
};

const countLogs = async ({ topicId, sessionId, role, eventType, search, sourcePage }) => {
  const { whereSql, params } = buildWhereClause({ topicId, sessionId, role, eventType, search, sourcePage });
  const rows = await query(
    `
      SELECT COUNT(*) AS total
      FROM web_chat_logs
      ${whereSql}
    `,
    params
  );

  return Number(rows[0]?.total || 0);
};

const getStats = async () => {
  const rows = await query(
    `
      SELECT
        COUNT(*) AS total_messages,
        COUNT(DISTINCT session_id) AS total_sessions,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) AS total_user_messages,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) AS total_assistant_messages,
        SUM(CASE WHEN event_type = 'lead_capture' THEN 1 ELSE 0 END) AS total_leads
      FROM web_chat_logs
    `
  );

  return rows[0] || {
    total_messages: 0,
    total_sessions: 0,
    total_user_messages: 0,
    total_assistant_messages: 0,
    total_leads: 0
  };
};

module.exports = {
  createLog,
  listLogs,
  countLogs,
  getStats
};
