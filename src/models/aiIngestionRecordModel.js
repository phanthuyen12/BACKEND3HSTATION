const { query, execute } = require('../config/database');

const listRecords = async ({ sourceModule, processingStatus, reviewStatus, search, limit, offset }) => {
  const clauses = [];
  const params = [];

  if (sourceModule) {
    clauses.push('source_module = ?');
    params.push(sourceModule);
  }

  if (processingStatus) {
    clauses.push('processing_status = ?');
    params.push(processingStatus);
  }

  if (reviewStatus) {
    clauses.push('review_status = ?');
    params.push(reviewStatus);
  }

  if (search) {
    clauses.push('(original_file_name LIKE ? OR extracted_text LIKE ? OR error_message LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(
    `SELECT *
     FROM ai_ingestion_records
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows;
};

const countRecords = async ({ sourceModule, processingStatus, reviewStatus, search }) => {
  const clauses = [];
  const params = [];

  if (sourceModule) {
    clauses.push('source_module = ?');
    params.push(sourceModule);
  }

  if (processingStatus) {
    clauses.push('processing_status = ?');
    params.push(processingStatus);
  }

  if (reviewStatus) {
    clauses.push('review_status = ?');
    params.push(reviewStatus);
  }

  if (search) {
    clauses.push('(original_file_name LIKE ? OR extracted_text LIKE ? OR error_message LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM ai_ingestion_records
     ${where}`,
    params
  );

  return Number(rows[0]?.total || 0);
};

const getRecordById = async (id) => {
  const rows = await query('SELECT * FROM ai_ingestion_records WHERE id = ?', [id]);
  return rows[0] || null;
};

const createRecord = async (payload) => {
  const sql = `
    INSERT INTO ai_ingestion_records (
      source_module,
      ai_provider,
      original_file_name,
      stored_file_name,
      file_path,
      file_url,
      mime_type,
      file_size,
      external_file_id,
      external_file_uri,
      extracted_text,
      processing_status,
      review_status,
      review_note,
      error_message,
      created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await execute(sql, [
    payload.sourceModule || 'ai_video',
    payload.aiProvider || null,
    payload.originalFileName,
    payload.storedFileName || null,
    payload.filePath || null,
    payload.fileUrl || null,
    payload.mimeType || null,
    payload.fileSize || null,
    payload.externalFileId || null,
    payload.externalFileUri || null,
    payload.extractedText || null,
    payload.processingStatus || 'pending',
    payload.reviewStatus || 'pending',
    payload.reviewNote || null,
    payload.errorMessage || null,
    payload.createdByUserId || null,
  ]);

  return getRecordById(result.insertId);
};

const updateRecord = async (id, payload) => {
  const fields = [];
  const params = [];

  const mapping = {
    extracted_text: payload.extractedText,
    processing_status: payload.processingStatus,
    review_status: payload.reviewStatus,
    review_note: payload.reviewNote,
    error_message: payload.errorMessage,
    external_file_id: payload.externalFileId,
    external_file_uri: payload.externalFileUri,
    ai_provider: payload.aiProvider,
    file_url: payload.fileUrl,
    file_path: payload.filePath,
    stored_file_name: payload.storedFileName,
    mime_type: payload.mimeType,
    file_size: payload.fileSize,
  };

  Object.entries(mapping).forEach(([column, value]) => {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value);
    }
  });

  if (!fields.length) {
    return getRecordById(id);
  }

  params.push(id);
  await execute(
    `UPDATE ai_ingestion_records
     SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    params
  );

  return getRecordById(id);
};

module.exports = {
  listRecords,
  countRecords,
  getRecordById,
  createRecord,
  updateRecord,
};
