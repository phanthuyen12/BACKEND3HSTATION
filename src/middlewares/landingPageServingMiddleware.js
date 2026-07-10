const fs = require('fs');
const path = require('path');
const landingPageModel = require('../models/landingPageModel');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * Injects CSS/JS into the HTML layout dynamically
 */
const compileHtml = (htmlContent, cssContent, jsContent) => {
  let compiled = htmlContent || '';
  
  if (cssContent) {
    const styleTag = `\n<style>\n${cssContent}\n</style>\n`;
    if (compiled.includes('</head>')) {
      compiled = compiled.replace('</head>', `${styleTag}</head>`);
    } else {
      compiled = styleTag + compiled;
    }
  }

  if (jsContent) {
    const scriptTag = `\n<script>\n${jsContent}\n</script>\n`;
    if (compiled.includes('</body>')) {
      compiled = compiled.replace('</body>', `${scriptTag}</body>`);
    } else {
      compiled = compiled + scriptTag;
    }
  }

  return compiled;
};

/**
 * Injects a <base href> tag into <head> so that relative asset paths
 * (images/, css/, js/, fonts/) resolve correctly relative to the landing page path.
 * Example: LP path = "/page01" → <base href="/page01/">
 * Then src="images/banner.jpg" resolves to "/page01/images/banner.jpg" automatically.
 */
const injectBaseHref = (htmlContent, lpPath) => {
  // No need to inject if page is served at root /
  if (!lpPath || lpPath === '/') return htmlContent;

  const normalizedPath = lpPath.endsWith('/') ? lpPath : lpPath + '/';
  const baseTag = `<base href="${normalizedPath}">`;

  if (htmlContent.includes('<head>')) {
    return htmlContent.replace('<head>', `<head>\n  ${baseTag}`);
  } else if (htmlContent.match(/<head[^>]*>/i)) {
    return htmlContent.replace(/<head[^>]*>/i, (m) => `${m}\n  ${baseTag}`);
  }
  // No <head> tag — prepend base tag at top
  return baseTag + '\n' + htmlContent;
};


const landingPageServingMiddleware = async (req, res, next) => {
  // 1. Skip API and Health Check routes
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }

  const requestHost = req.hostname; // e.g., 'localhost' or 'landing.domain.com'
  const requestPath = req.path; // e.g., '/khuyen-mai' or '/css/style.css'

  // 🔍 DEBUG LOG — xóa sau khi fix xong
  console.log(`[LP-DEBUG] ► Host: "${requestHost}" | Path: "${requestPath}"`);

  // 2. PRIVATE PREVIEW ROUTE
  // Match format: /preview/lp/:token (and subpaths)
  const previewRegex = /^\/preview\/lp\/([a-f0-9]{64})(.*)/;
  const previewMatch = requestPath.match(previewRegex);

  if (previewMatch) {
    const token = previewMatch[1];
    let subpath = previewMatch[2] || '/';

    // Normalize subpath
    if (subpath === '') subpath = '/';

    try {
      const lp = await landingPageModel.getLandingPageByPreviewToken(token);
      if (!lp) {
        return res.status(404).send('Không tìm thấy bản xem trước hoặc mã xem trước không hợp lệ.');
      }

      // Serve preview (Always serves the current draft contents)
      if (subpath === '/' || subpath === '/index.html') {
        if (lp.draft_assets_path) {
          const indexHtmlPath = path.join(UPLOADS_DIR, 'landing-pages', String(lp.id), 'draft', 'index.html');
          if (fs.existsSync(indexHtmlPath)) {
            let html = fs.readFileSync(indexHtmlPath, 'utf8');
            html = injectBaseHref(html, lp.path);
            html = compileHtml(html, lp.draft_css, lp.draft_js);
            return res.send(html);
          } else {
            return res.status(404).send('Không tìm thấy file index.html trong bản nháp tải lên.');
          }
        } else {
          // Serve from raw editor code
          const html = compileHtml(lp.draft_html, lp.draft_css, lp.draft_js);
          return res.send(html);
        }
      } else {
        // Serve static asset from draft folder
        if (lp.draft_assets_path) {
          const filePath = path.join(UPLOADS_DIR, 'landing-pages', String(lp.id), 'draft', subpath);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return res.sendFile(filePath);
          }
        }
        return res.status(404).send('Không tìm thấy tài nguyên.');
      }
    } catch (err) {
      console.error('Error serving private preview:', err);
      return res.status(500).send('Lỗi máy chủ khi tải bản xem trước.');
    }
  }

  // 3. PUBLIC ROUTING MATCH
  try {
    // Get all potential published/scheduled pages on this hostname
    const candidates = await landingPageModel.listLandingPages({
      status: 'all', // we will check status inside
      limit: 1000
    });

    const hostPages = candidates.filter(lp => 
      lp.domain.toLowerCase() === requestHost.toLowerCase() && 
      (lp.status === 'published' || lp.status === 'scheduled')
    );

    // 🔍 DEBUG LOG — xóa sau khi fix xong
    console.log(`[LP-DEBUG] ► All domains in DB:`, candidates.map(lp => `"${lp.domain}" (${lp.status})`));
    console.log(`[LP-DEBUG] ► Matched pages for host "${requestHost}": ${hostPages.length}`);

    if (hostPages.length === 0) {
      return next(); // No landing pages configured for this hostname, continue to normal routing
    }

    // Sort by path length descending so that specific paths match before root /
    hostPages.sort((a, b) => b.path.length - a.path.length);

    let matchedLp = null;
    let subpath = '/';

    for (const lp of hostPages) {
      if (lp.path === '/') {
        matchedLp = lp;
        subpath = requestPath;
        break;
      } else if (requestPath === lp.path) {
        matchedLp = lp;
        subpath = '/';
        break;
      } else if (requestPath.startsWith(lp.path + '/')) {
        matchedLp = lp;
        subpath = requestPath.slice(lp.path.length);
        break;
      }
    }

    if (!matchedLp) {
      return next(); // Path doesn't match any landing page, let standard routes handle it
    }

    // Check Scheduler status
    const now = new Date();
    if (matchedLp.status === 'scheduled') {
      const start = matchedLp.publish_start_at ? new Date(matchedLp.publish_start_at) : null;
      if (start && now < start) {
        return next(); // Not yet active
      }
      
      // If start passed and no end, or now is within bounds, it should become active
      const end = matchedLp.publish_end_at ? new Date(matchedLp.publish_end_at) : null;
      if (end && now > end) {
        // Expired! Auto update status in DB
        await landingPageModel.updateLandingPage(matchedLp.id, { status: 'expired' });
        return next();
      }
    } else if (matchedLp.status === 'published' && matchedLp.publish_end_at) {
      // Check if expired
      const end = new Date(matchedLp.publish_end_at);
      if (now > end) {
        await landingPageModel.updateLandingPage(matchedLp.id, { status: 'expired' });
        return next(); // Expired
      }
    }

    // We have a matched, active, published Landing Page!
    // Get active version details
    if (!matchedLp.active_version_id) {
      return res.status(404).send('Landing Page chưa có phiên bản xuất bản hoạt động.');
    }

    const activeVersion = await landingPageModel.getVersionById(matchedLp.active_version_id);
    if (!activeVersion) {
      return res.status(404).send('Không tìm thấy phiên bản hoạt động.');
    }

    // Increment Views
    if (subpath === '/' || subpath === '/index.html') {
      await landingPageModel.incrementViews(matchedLp.id);
    }

    // Serve version content
    if (subpath === '/' || subpath === '/index.html') {
      if (activeVersion.assets_path) {
        const indexHtmlPath = path.join(UPLOADS_DIR, 'landing-pages', String(matchedLp.id), 'versions', String(activeVersion.version_number), 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          let html = fs.readFileSync(indexHtmlPath, 'utf8');
          html = injectBaseHref(html, matchedLp.path);
          html = compileHtml(html, activeVersion.css, activeVersion.js);
          return res.send(html);
        } else {
          return res.status(404).send('Không tìm thấy file index.html trong phiên bản xuất bản.');
        }
      } else {
        const html = compileHtml(activeVersion.html, activeVersion.css, activeVersion.js);
        return res.send(html);
      }
    } else {
      // Serve static asset from version folder
      if (activeVersion.assets_path) {
        const filePath = path.join(UPLOADS_DIR, 'landing-pages', String(matchedLp.id), 'versions', String(activeVersion.version_number), subpath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          return res.sendFile(filePath);
        }
      }
      return res.status(404).send('Không tìm thấy tài nguyên.');
    }
  } catch (err) {
    console.error('Error serving Landing Page:', err);
    return res.status(500).send('Lỗi máy chủ khi tải trang.');
  }
};

module.exports = landingPageServingMiddleware;
