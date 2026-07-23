const { query, execute } = require('../config/database');

// ==========================================
// 1. DOMAINS MANAGEMENT
// ==========================================

const getAllDomains = async () => {
  return query('SELECT * FROM landing_page_domains ORDER BY domain ASC');
};

const addDomain = async (domain) => {
  const sql = 'INSERT INTO landing_page_domains (domain) VALUES (?)';
  const [result] = await execute(sql, [domain]);
  return { id: result.insertId, domain };
};

const deleteDomain = async (id) => {
  const sql = 'DELETE FROM landing_page_domains WHERE id = ?';
  await execute(sql, [id]);
};

const checkDomainExists = async (domain) => {
  const rows = await query('SELECT id FROM landing_page_domains WHERE domain = ? LIMIT 1', [domain]);
  return rows.length > 0;
};

// ==========================================
// 2. LANDING PAGES MANAGEMENT
// ==========================================

const listLandingPages = async ({ search = '', status = '', limit = 100, offset = 0 } = {}) => {
  let sql = `
    SELECT lp.*, u.name as creator_name
    FROM landing_pages lp
    LEFT JOIN users u ON lp.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ' AND (lp.title LIKE ? OR lp.domain LIKE ? OR lp.path LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (status && status !== 'all') {
    sql += ' AND lp.status = ?';
    params.push(status);
  } else {
    // By default, exclude permanently deleted if status doesn't match 'trash'
    // Actually, 'trash' is a status in our ENUM. If status is empty (all), we show everything EXCEPT trash.
    if (status !== 'trash') {
      sql += " AND lp.status != 'trash'";
    }
  }

  sql += ' ORDER BY lp.updated_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  return query(sql, params);
};

const countLandingPages = async ({ search = '', status = '' } = {}) => {
  let sql = `
    SELECT COUNT(*) as total
    FROM landing_pages lp
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ' AND (lp.title LIKE ? OR lp.domain LIKE ? OR lp.path LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (status && status !== 'all') {
    sql += ' AND lp.status = ?';
    params.push(status);
  } else {
    if (status !== 'trash') {
      sql += " AND lp.status != 'trash'";
    }
  }

  const rows = await query(sql, params);
  return rows[0]?.total || 0;
};

const getLandingPageById = async (id) => {
  const rows = await query(
    `SELECT lp.*, u.name as creator_name 
     FROM landing_pages lp 
     LEFT JOIN users u ON lp.created_by = u.id 
     WHERE lp.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const getLandingPageByDomainAndPath = async (domain, path) => {
  const rows = await query(
    'SELECT * FROM landing_pages WHERE domain = ? AND path = ? LIMIT 1',
    [domain, path]
  );
  return rows[0] || null;
};

const getLandingPageByPreviewToken = async (token) => {
  const rows = await query(
    'SELECT * FROM landing_pages WHERE preview_token = ? LIMIT 1',
    [token]
  );
  return rows[0] || null;
};

const createLandingPage = async (data) => {
  const sql = `
    INSERT INTO landing_pages (
      title, domain, path, status, publish_start_at, publish_end_at, 
      created_by, draft_html, draft_css, draft_js, draft_assets_path, preview_token,
      google_sheet_id, google_sheet_tab_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    data.title,
    data.domain,
    data.path,
    data.status || 'draft',
    data.publish_start_at || null,
    data.publish_end_at || null,
    data.created_by,
    data.draft_html || null,
    data.draft_css || null,
    data.draft_js || null,
    data.draft_assets_path || null,
    data.preview_token,
    data.google_sheet_id || null,
    data.google_sheet_tab_name || null
  ];

  const [result] = await execute(sql, params);
  return getLandingPageById(result.insertId);
};

const updateLandingPage = async (id, data) => {
  const fields = [];
  const params = [];

  const allowedFields = [
    'title', 'domain', 'path', 'status', 'publish_start_at', 'publish_end_at',
    'active_version_id', 'draft_html', 'draft_css', 'draft_js', 'draft_assets_path',
    'google_sheet_id', 'google_sheet_tab_name'
  ];

  Object.keys(data).forEach((key) => {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  });

  if (fields.length === 0) return getLandingPageById(id);

  params.push(id);
  const sql = `UPDATE landing_pages SET ${fields.join(', ')} WHERE id = ?`;
  await execute(sql, params);
  return getLandingPageById(id);
};

const deleteLandingPage = async (id) => {
  await execute('DELETE FROM landing_pages WHERE id = ?', [id]);
};

const incrementViews = async (id) => {
  await execute('UPDATE landing_pages SET views_count = views_count + 1 WHERE id = ?', [id]);
};

const incrementSubmissions = async (id) => {
  await execute('UPDATE landing_pages SET submissions_count = submissions_count + 1 WHERE id = ?', [id]);
};

// ==========================================
// 3. VERSIONS HISTORY
// ==========================================

const getVersionsByLandingPageId = async (landingPageId) => {
  return query(
    `SELECT lpv.*, u.name as creator_name 
     FROM landing_page_versions lpv
     LEFT JOIN users u ON lpv.created_by = u.id
     WHERE lpv.landing_page_id = ? 
     ORDER BY lpv.version_number DESC`,
    [landingPageId]
  );
};

const getVersionById = async (id) => {
  const rows = await query('SELECT * FROM landing_page_versions WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

const getLatestVersionNumber = async (landingPageId) => {
  const rows = await query(
    'SELECT MAX(version_number) as max_ver FROM landing_page_versions WHERE landing_page_id = ?',
    [landingPageId]
  );
  return rows[0]?.max_ver || 0;
};

const createVersion = async (data) => {
  const sql = `
    INSERT INTO landing_page_versions (
      landing_page_id, version_number, html, css, js, assets_path, created_by, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    data.landing_page_id,
    data.version_number,
    data.html,
    data.css || null,
    data.js || null,
    data.assets_path || null,
    data.created_by,
    data.description || null
  ];

  const [result] = await execute(sql, params);
  return getVersionById(result.insertId);
};

const deleteVersion = async (id) => {
  await execute('DELETE FROM landing_page_versions WHERE id = ?', [id]);
};

// ==========================================
// 4. SUBMISSIONS (LEADS)
// ==========================================

const createSubmission = async (data) => {
  const sql = `
    INSERT INTO landing_page_submissions (landing_page_id, data, ip_address, user_agent)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await execute(sql, [
    data.landing_page_id,
    JSON.stringify(data.fields),
    data.ip_address || null,
    data.user_agent || null
  ]);
  
  // Auto-increment the submission stats in landing_pages
  await incrementSubmissions(data.landing_page_id);
  
  const rows = await query('SELECT * FROM landing_page_submissions WHERE id = ? LIMIT 1', [result.insertId]);
  return rows[0];
};

const getSubmissionsByLandingPageId = async (landingPageId) => {
  return query(
    'SELECT * FROM landing_page_submissions WHERE landing_page_id = ? ORDER BY submitted_at DESC',
    [landingPageId]
  );
};

const deleteSubmission = async (id) => {
  await execute('DELETE FROM landing_page_submissions WHERE id = ?', [id]);
};

// ==========================================
// 5. AUDIT LOGS
// ==========================================

const createLog = async (data) => {
  const sql = `
    INSERT INTO landing_page_logs (landing_page_id, user_id, action, details)
    VALUES (?, ?, ?, ?)
  `;
  await execute(sql, [
    data.landing_page_id || null,
    data.user_id || null,
    data.action,
    data.details || null
  ]);
};

const getLogsByLandingPageId = async (landingPageId) => {
  return query(
    `SELECT lpl.*, u.name as user_name 
     FROM landing_page_logs lpl
     LEFT JOIN users u ON lpl.user_id = u.id
     WHERE lpl.landing_page_id = ? 
     ORDER BY lpl.created_at DESC`,
    [landingPageId]
  );
};

module.exports = {
  getAllDomains,
  addDomain,
  deleteDomain,
  checkDomainExists,
  listLandingPages,
  countLandingPages,
  getLandingPageById,
  getLandingPageByDomainAndPath,
  getLandingPageByPreviewToken,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
  incrementViews,
  incrementSubmissions,
  getVersionsByLandingPageId,
  getVersionById,
  getLatestVersionNumber,
  createVersion,
  deleteVersion,
  createSubmission,
  getSubmissionsByLandingPageId,
  deleteSubmission,
  createLog,
  getLogsByLandingPageId
};
