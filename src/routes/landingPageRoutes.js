const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const landingPageController = require('../controllers/landingPageController');
const { authenticate, authorizeRoles } = require('../middlewares/auth');

// Configure multer for temp ZIP storage
const tempUploadDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}
const upload = multer({
  dest: tempUploadDir,
  limits: { fileSize: 15 * 1024 * 1024 }, // Max 15MB ZIP upload
  fileFilter: (req, file, cb) => {
    const isZip = file.mimetype === 'application/zip' || 
                  file.mimetype === 'application/x-zip-compressed' || 
                  file.originalname.endsWith('.zip');
    if (isZip) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép tải lên file định dạng .zip'));
    }
  }
});

const router = express.Router();

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================
// Lead ingestion (form post submission) - does NOT require login
router.post('/:id/submit', landingPageController.submitLead);

// ==========================================
// ADMIN ENDPOINTS (Requires authentication)
// ==========================================
router.use(authenticate);

// Domains configuration
router.get('/domains', authorizeRoles('admin', 'staff', 'viewer'), landingPageController.getDomains);
router.post('/domains', authorizeRoles('admin', 'staff'), landingPageController.createDomain);
router.delete('/domains/:id', authorizeRoles('admin', 'staff'), landingPageController.removeDomain);

// Landing Pages list & CRUD
router.get('/', authorizeRoles('admin', 'staff', 'viewer'), landingPageController.getLandingPages);
router.get('/:id', authorizeRoles('admin', 'staff', 'viewer'), landingPageController.getLandingPage);
router.post('/', authorizeRoles('admin', 'staff'), landingPageController.createLandingPage);
router.put('/:id', authorizeRoles('admin', 'staff'), landingPageController.updateLandingPage);
router.delete('/:id', authorizeRoles('admin', 'staff'), landingPageController.deleteLandingPage); // Trash
router.delete('/:id/permanent', authorizeRoles('admin', 'staff'), landingPageController.destroyLandingPage); // Permanent delete
router.post('/:id/clone', authorizeRoles('admin', 'staff'), landingPageController.cloneLandingPage);

// ZIP Upload
router.post('/:id/upload', upload.single('zipFile'), authorizeRoles('admin', 'staff'), landingPageController.uploadZip);

// Publishing & Versions
router.post('/:id/publish', authorizeRoles('admin', 'staff'), landingPageController.publishLandingPage);
router.get('/:id/versions', authorizeRoles('admin', 'staff', 'viewer'), landingPageController.getVersions);
router.post('/:id/versions/:versionId/restore', authorizeRoles('admin', 'staff'), landingPageController.restoreVersion);

// Submissions (Leads) & Audit logs
router.get('/:id/submissions', authorizeRoles('admin', 'staff', 'viewer'), landingPageController.getSubmissions);
router.delete('/submissions/:submissionId', authorizeRoles('admin', 'staff'), landingPageController.removeSubmission);
router.get('/:id/logs', authorizeRoles('admin', 'staff', 'viewer'), landingPageController.getLogs);

module.exports = router;
