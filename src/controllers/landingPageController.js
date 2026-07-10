const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const landingPageModel = require('../models/landingPageModel');
const { extractZip } = require('../utils/zip');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

// Base directory for uploads
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// ==========================================
// 1. DOMAINS CONTROLLER
// ==========================================

const getDomains = asyncHandler(async (req, res) => {
  const domains = await landingPageModel.getAllDomains();
  res.json({ success: true, data: domains });
});

const createDomain = asyncHandler(async (req, res) => {
  const { domain } = req.body;
  if (!domain) {
    throw ApiError.badRequest('Domain name is required');
  }
  
  const normalized = domain.trim().toLowerCase();
  const exists = await landingPageModel.checkDomainExists(normalized);
  if (exists) {
    throw ApiError.badRequest('Domain already exists');
  }

  const result = await landingPageModel.addDomain(normalized);
  res.status(201).json({ success: true, data: result });
});

const removeDomain = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await landingPageModel.deleteDomain(id);
  res.json({ success: true, message: 'Domain deleted successfully' });
});

// ==========================================
// 2. LANDING PAGES CRUD
// ==========================================

const getLandingPages = asyncHandler(async (req, res) => {
  const { search, status, limit = 100, offset = 0 } = req.query;
  const list = await landingPageModel.listLandingPages({ search, status, limit, offset });
  const total = await landingPageModel.countLandingPages({ search, status });
  
  res.json({
    success: true,
    data: list,
    pagination: { total, limit: Number(limit), offset: Number(offset) }
  });
});

const getLandingPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lp = await landingPageModel.getLandingPageById(id);
  if (!lp) {
    throw ApiError.notFound('Landing Page not found');
  }
  res.json({ success: true, data: lp });
});

const createLandingPage = asyncHandler(async (req, res) => {
  const { title, domain, path: lpPath, status, publish_start_at, publish_end_at, draft_html, draft_css, draft_js } = req.body;
  
  if (!title || !domain || !lpPath) {
    throw ApiError.badRequest('Title, domain, and path are required');
  }

  // Normalize path (ensure leading slash, strip trailing slash except for root)
  let normalizedPath = lpPath.trim();
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }
  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  // Check unique domain + path
  const existing = await landingPageModel.getLandingPageByDomainAndPath(domain, normalizedPath);
  if (existing) {
    throw ApiError.badRequest(`A landing page with path "${normalizedPath}" already exists on domain "${domain}"`);
  }

  const previewToken = crypto.randomBytes(32).toString('hex');

  const lp = await landingPageModel.createLandingPage({
    title: title.trim(),
    domain: domain.trim(),
    path: normalizedPath,
    status: status || 'draft',
    publish_start_at,
    publish_end_at,
    created_by: req.user?.id || null,
    draft_html,
    draft_css,
    draft_js,
    preview_token: previewToken
  });

  await landingPageModel.createLog({
    landing_page_id: lp.id,
    user_id: req.user?.id,
    action: 'create',
    details: `Created Landing Page "${lp.title}"`
  });

  res.status(201).json({ success: true, data: lp });
});

const updateLandingPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, domain, path: lpPath, status, publish_start_at, publish_end_at, draft_html, draft_css, draft_js } = req.body;

  const lp = await landingPageModel.getLandingPageById(id);
  if (!lp) {
    throw ApiError.notFound('Landing Page not found');
  }

  const updateData = {};

  if (title) updateData.title = title.trim();
  
  // Handle domain & path change with duplicate checks
  if (domain || lpPath) {
    const finalDomain = domain || lp.domain;
    let finalPath = lpPath !== undefined ? lpPath.trim() : lp.path;
    
    if (!finalPath.startsWith('/')) {
      finalPath = '/' + finalPath;
    }
    if (finalPath.length > 1 && finalPath.endsWith('/')) {
      finalPath = finalPath.slice(0, -1);
    }

    if (finalDomain !== lp.domain || finalPath !== lp.path) {
      const duplicate = await landingPageModel.getLandingPageByDomainAndPath(finalDomain, finalPath);
      if (duplicate && duplicate.id !== Number(id)) {
        throw ApiError.badRequest(`Conflict: path "${finalPath}" on domain "${finalDomain}" is already in use`);
      }
      updateData.domain = finalDomain;
      updateData.path = finalPath;
    }
  }

  if (status) updateData.status = status;
  if (publish_start_at !== undefined) updateData.publish_start_at = publish_start_at;
  if (publish_end_at !== undefined) updateData.publish_end_at = publish_end_at;
  if (draft_html !== undefined) updateData.draft_html = draft_html;
  if (draft_css !== undefined) updateData.draft_css = draft_css;
  if (draft_js !== undefined) updateData.draft_js = draft_js;

  const updated = await landingPageModel.updateLandingPage(id, updateData);

  await landingPageModel.createLog({
    landing_page_id: id,
    user_id: req.user?.id,
    action: 'update',
    details: 'Updated Landing Page details/code'
  });

  res.json({ success: true, data: updated });
});

const deleteLandingPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lp = await landingPageModel.getLandingPageById(id);
  if (!lp) {
    throw ApiError.notFound('Landing Page not found');
  }

  // Move to trash
  await landingPageModel.updateLandingPage(id, { status: 'trash' });

  await landingPageModel.createLog({
    landing_page_id: id,
    user_id: req.user?.id,
    action: 'trash',
    details: 'Moved Landing Page to trash'
  });

  res.json({ success: true, message: 'Landing Page moved to trash' });
});

const destroyLandingPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lp = await landingPageModel.getLandingPageById(id);
  if (!lp) {
    throw ApiError.notFound('Landing Page not found');
  }

  // Permanent delete from database (CASCADE handles foreign keys)
  await landingPageModel.deleteLandingPage(id);

  // Delete files from filesystem
  const lpFolder = path.join(UPLOADS_DIR, 'landing-pages', String(id));
  if (fs.existsSync(lpFolder)) {
    try {
      fs.rmSync(lpFolder, { recursive: true, force: true });
    } catch (e) {
      console.error(`Failed to delete landing page directory: ${lpFolder}`, e);
    }
  }

  res.json({ success: true, message: 'Landing Page permanently deleted' });
});

const cloneLandingPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const original = await landingPageModel.getLandingPageById(id);
  if (!original) {
    throw ApiError.notFound('Original Landing Page not found');
  }

  // Find a unique path slug
  let suffix = 1;
  let newPath = `${original.path}-copy`;
  let duplicate = await landingPageModel.getLandingPageByDomainAndPath(original.domain, newPath);
  while (duplicate) {
    suffix++;
    newPath = `${original.path}-copy-${suffix}`;
    duplicate = await landingPageModel.getLandingPageByDomainAndPath(original.domain, newPath);
  }

  const previewToken = crypto.randomBytes(32).toString('hex');

  // Create clone record in DB
  const cloned = await landingPageModel.createLandingPage({
    title: `${original.title} (Bản sao)`,
    domain: original.domain,
    path: newPath,
    status: 'draft', // Clones start as draft
    publish_start_at: null,
    publish_end_at: null,
    created_by: req.user?.id || null,
    draft_html: original.draft_html,
    draft_css: original.draft_css,
    draft_js: original.draft_js,
    draft_assets_path: original.draft_assets_path ? `/landing-pages/${original.id}/draft` : null, // we will update this after copying files
    preview_token: previewToken
  });

  // Copy uploads directory if exists
  const origFolder = path.join(UPLOADS_DIR, 'landing-pages', String(original.id));
  const cloneFolder = path.join(UPLOADS_DIR, 'landing-pages', String(cloned.id));

  if (fs.existsSync(origFolder)) {
    try {
      fs.mkdirSync(cloneFolder, { recursive: true });
      fs.cpSync(origFolder, cloneFolder, { recursive: true });
      
      // If original had draft assets, update cloned assets path
      if (original.draft_assets_path) {
        await landingPageModel.updateLandingPage(cloned.id, {
          draft_assets_path: `/landing-pages/${cloned.id}/draft`
        });
      }
    } catch (e) {
      console.error(`Failed to copy assets folder from ${origFolder} to ${cloneFolder}`, e);
    }
  }

  await landingPageModel.createLog({
    landing_page_id: cloned.id,
    user_id: req.user?.id,
    action: 'clone',
    details: `Cloned from Landing Page ID ${original.id}`
  });

  res.status(201).json({ success: true, data: cloned });
});

// ==========================================
// 3. ZIP UPLOAD AND SOURCE EXTRACTION
// ==========================================

const uploadZip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    throw ApiError.badRequest('No ZIP file uploaded');
  }

  const lp = await landingPageModel.getLandingPageById(id);
  if (!lp) {
    // Delete uploaded temp file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    throw ApiError.notFound('Landing Page not found');
  }

  const targetDir = path.join(UPLOADS_DIR, 'landing-pages', String(id), 'draft');
  
  // Empty draft directory first to ensure clean state
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  try {
    // Extract zip contents
    await extractZip(req.file.path, targetDir);

    // Delete temp zip file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    // Parse index.html to save in draft_html for editor view
    let indexHtmlContent = '';
    const indexHtmlPath = path.join(targetDir, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    }

    // Update landing page
    const updated = await landingPageModel.updateLandingPage(id, {
      draft_html: indexHtmlContent || lp.draft_html || '<!-- Extracted index.html not found at zip root -->',
      draft_assets_path: `/landing-pages/${id}/draft`
    });

    await landingPageModel.createLog({
      landing_page_id: id,
      user_id: req.user?.id,
      action: 'upload_zip',
      details: 'Uploaded ZIP package'
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    throw ApiError.badRequest(`ZIP extraction/processing failed: ${err.message}`);
  }
});

// ==========================================
// 4. PUBLISHING AND VERSION CONTROL
// ==========================================

const publishLandingPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  const lp = await landingPageModel.getLandingPageById(id);
  if (!lp) {
    throw ApiError.notFound('Landing Page not found');
  }

  // Get next version number
  const nextVer = (await landingPageModel.getLatestVersionNumber(id)) + 1;
  const versionFolder = path.join(UPLOADS_DIR, 'landing-pages', String(id), 'versions', String(nextVer));

  // If the page has zip draft assets, copy them to the version folder
  let versionAssetsPath = null;
  if (lp.draft_assets_path) {
    const draftFolder = path.join(UPLOADS_DIR, 'landing-pages', String(id), 'draft');
    if (fs.existsSync(draftFolder)) {
      fs.mkdirSync(versionFolder, { recursive: true });
      fs.cpSync(draftFolder, versionFolder, { recursive: true });
      versionAssetsPath = `/landing-pages/${id}/versions/${nextVer}`;
    }
  }

  // Create version in database
  const version = await landingPageModel.createVersion({
    landing_page_id: id,
    version_number: nextVer,
    html: lp.draft_html || '',
    css: lp.draft_css,
    js: lp.draft_js,
    assets_path: versionAssetsPath,
    created_by: req.user?.id || null,
    description: description || `Version ${nextVer} publication`
  });

  // Activate this version in landing page record
  const updated = await landingPageModel.updateLandingPage(id, {
    active_version_id: version.id,
    status: lp.status === 'scheduled' ? 'scheduled' : 'published'
  });

  await landingPageModel.createLog({
    landing_page_id: id,
    user_id: req.user?.id,
    action: 'publish',
    details: `Published version ${nextVer}`
  });

  res.json({ success: true, data: updated, version });
});

const getVersions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const versions = await landingPageModel.getVersionsByLandingPageId(id);
  res.json({ success: true, data: versions });
});

const restoreVersion = asyncHandler(async (req, res) => {
  const { id, versionId } = req.params;

  const lp = await landingPageModel.getLandingPageById(id);
  if (!lp) {
    throw ApiError.notFound('Landing Page not found');
  }

  const version = await landingPageModel.getVersionById(versionId);
  if (!version || version.landing_page_id !== Number(id)) {
    throw ApiError.notFound('Version not found for this Landing Page');
  }

  // Rollback active_version_id and copy version code back to draft so they can edit it
  const updated = await landingPageModel.updateLandingPage(id, {
    active_version_id: version.id,
    draft_html: version.html,
    draft_css: version.css,
    draft_js: version.js,
    status: 'published' // Ensure it is published
  });

  // If the version had assets, we copy version assets folder back to the draft folder
  if (version.assets_path) {
    const versionFolder = path.join(UPLOADS_DIR, 'landing-pages', String(id), 'versions', String(version.version_number));
    const draftFolder = path.join(UPLOADS_DIR, 'landing-pages', String(id), 'draft');
    if (fs.existsSync(versionFolder)) {
      fs.rmSync(draftFolder, { recursive: true, force: true });
      fs.mkdirSync(draftFolder, { recursive: true });
      fs.cpSync(versionFolder, draftFolder, { recursive: true });
      
      await landingPageModel.updateLandingPage(id, {
        draft_assets_path: `/landing-pages/${id}/draft`
      });
    }
  } else {
    // If version had no assets, clear draft_assets_path
    await landingPageModel.updateLandingPage(id, {
      draft_assets_path: null
    });
    const draftFolder = path.join(UPLOADS_DIR, 'landing-pages', String(id), 'draft');
    if (fs.existsSync(draftFolder)) {
      fs.rmSync(draftFolder, { recursive: true, force: true });
    }
  }

  await landingPageModel.createLog({
    landing_page_id: id,
    user_id: req.user?.id,
    action: 'restore_version',
    details: `Restored version ${version.version_number} to active site`
  });

  res.json({ success: true, data: updated, restoredVersion: version });
});

// ==========================================
// 5. SUBMISSIONS & LEAD INGESTION
// ==========================================

const getSubmissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const submissions = await landingPageModel.getSubmissionsByLandingPageId(id);
  
  // Parse JSON data for frontend consumption
  const parsed = submissions.map(sub => {
    try {
      return {
        ...sub,
        data: typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data
      };
    } catch (e) {
      return sub;
    }
  });

  res.json({ success: true, data: parsed });
});

const removeSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  await landingPageModel.deleteSubmission(submissionId);
  res.json({ success: true, message: 'Submission deleted' });
});

/**
 * Public Form Submission API
 */
const submitLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lp = await landingPageModel.getLandingPageById(id);
  if (!lp) {
    throw ApiError.notFound('Landing Page not found');
  }

  // Exclude administrative parameters or internal settings, save everything else
  const fields = { ...req.body };
  const redirectUrl = fields._redirect || fields.redirect_url || null;
  delete fields._redirect;
  delete fields.redirect_url;

  const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  await landingPageModel.createSubmission({
    landing_page_id: id,
    fields,
    ip_address: ipAddress,
    user_agent: userAgent
  });

  // Handle browser redirect or JSON AJAX response
  if (redirectUrl) {
    return res.redirect(redirectUrl);
  }

  if (req.xhr || req.headers.accept?.includes('json') || req.headers['content-type']?.includes('json')) {
    return res.json({ success: true, message: 'Cảm ơn bạn! Thông tin của bạn đã được ghi nhận.' });
  }

  // Return a simple, beautiful success page
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Đăng ký thành công</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', sans-serif;
          background-color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          color: #334155;
        }
        .container {
          background: white;
          padding: 2.5rem;
          border-radius: 1rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          text-align: center;
          max-width: 400px;
          width: 90%;
        }
        .icon {
          width: 4rem;
          height: 4rem;
          background-color: #dcfce7;
          color: #16a34a;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto 1.5rem;
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
          color: #1e293b;
        }
        p {
          font-size: 0.95rem;
          line-height: 1.5;
          color: #64748b;
          margin: 0 0 1.5rem;
        }
        .btn {
          display: inline-block;
          background-color: #3b82f6;
          color: white;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }
        .btn:hover {
          background-color: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✓</div>
        <h1>Đăng ký thành công!</h1>
        <p>Thông tin của bạn đã được ghi nhận và gửi đến bộ phận quản trị. Xin cảm ơn!</p>
        <a href="javascript:history.back()" class="btn">Quay lại</a>
      </div>
    </body>
    </html>
  `);
});

// ==========================================
// 6. EVENT AUDIT LOGS
// ==========================================

const getLogs = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const logs = await landingPageModel.getLogsByLandingPageId(id);
  res.json({ success: true, data: logs });
});

module.exports = {
  getDomains,
  createDomain,
  removeDomain,
  getLandingPages,
  getLandingPage,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
  destroyLandingPage,
  cloneLandingPage,
  uploadZip,
  publishLandingPage,
  getVersions,
  restoreVersion,
  getSubmissions,
  removeSubmission,
  submitLead,
  getLogs
};
