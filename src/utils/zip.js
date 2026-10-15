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
 * Strip single root folder if ZIP was packed with a root directory.
 * 
 * Common ZIP structures from web projects:
 *   myproject.zip
 *   └── myproject/         ← single root folder
 *       ├── index.html
 *       ├── images/
 *       ├── css/
 *       └── js/
 * 
 * After strip, contents will be at:
 *   draft/index.html
 *   draft/images/
 *   draft/css/
 *   draft/js/
 */
const stripRootFolder = (dir) => {
  if (!fs.existsSync(dir)) return;

  // Clean Mac cruft at root first before checking for single root folder
  const macOsxPath = path.join(dir, '__MACOSX');
  if (fs.existsSync(macOsxPath)) fs.rmSync(macOsxPath, { recursive: true, force: true });

  const dsStorePath = path.join(dir, '.DS_Store');
  if (fs.existsSync(dsStorePath)) fs.rmSync(dsStorePath, { force: true });

  const entries = fs.readdirSync(dir);

  // Only strip if there is exactly ONE entry and it is a directory
  if (entries.length === 1) {
    const singleEntryPath = path.join(dir, entries[0]);
    const stat = fs.statSync(singleEntryPath);

    if (stat.isDirectory()) {
      console.log(`[ZIP] Auto-stripping root folder: "${entries[0]}"`);
      const innerEntries = fs.readdirSync(singleEntryPath);
      for (const entry of innerEntries) {
        const src = path.join(singleEntryPath, entry);
        const dest = path.join(dir, entry);
        fs.renameSync(src, dest);
      }
      fs.rmdirSync(singleEntryPath);
      console.log(`[ZIP] Root folder stripped. Files now at draft root.`);
    }
  }
};

/**
 * Extract zip using system unzip command, then strip root folder if needed.
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
        // Auto-strip single root folder (handles standard project ZIP structures)
        stripRootFolder(targetDir);

        // Security: remove dangerous file types
        cleanDangerousFiles(targetDir);
        resolve();
      } catch (err) {
        reject(new Error(`Extraction succeeded but post-processing failed: ${err.message}`));
      }
    });
  });
};

module.exports = {
  extractZip,
  ALLOWED_EXTENSIONS
};
