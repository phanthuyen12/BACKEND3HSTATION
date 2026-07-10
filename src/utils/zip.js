const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Safe extensions allowed for Landing Pages
const ALLOWED_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.js', '.json',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.txt', '.xml', '.mp4', '.mp3', '.webm'
]);

/**
 * Recursively scans directory and deletes files with extensions not in ALLOWED_EXTENSIONS
 */
const cleanDangerousFiles = (dir) => {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      cleanDangerousFiles(fullPath);
    } else {
      const ext = path.extname(file).toLowerCase();
      // Block double extensions or files with no extensions if needed, but simple blacklist/whitelist check is standard
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        try {
          fs.unlinkSync(fullPath);
          console.warn(`[SECURITY] Deleted unsafe/unallowed file during extraction: ${fullPath}`);
        } catch (e) {
          console.error(`[SECURITY] Failed to delete unsafe file: ${fullPath}`, e);
        }
      }
    }
  }
};

/**
 * Extract zip using system unzip command
 */
const extractZip = (zipFilePath, targetDir) => {
  return new Promise((resolve, reject) => {
    // Ensure target folder exists
    fs.mkdirSync(targetDir, { recursive: true });

    // Run system unzip command: -o (overwrite), -q (quiet)
    const cmd = `unzip -o -q "${zipFilePath}" -d "${targetDir}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Extraction failed: ${stderr || error.message}`));
      }

      try {
        // Enforce file whitelist check on extracted contents
        cleanDangerousFiles(targetDir);
        resolve();
      } catch (err) {
        reject(new Error(`Extraction succeeded but security sanitization failed: ${err.message}`));
      }
    });
  });
};

module.exports = {
  extractZip,
  ALLOWED_EXTENSIONS
};
