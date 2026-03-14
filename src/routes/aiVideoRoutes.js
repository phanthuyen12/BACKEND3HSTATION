const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const aiVideoController = require('../controllers/aiVideoController');

const router = express.Router();

// Configure multer for video storage
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /mp4|mov|avi|mkv|webm/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only video files are allowed!"));
  }
});

/**
 * @route POST /api/videos/process-batch
 * @desc Upload multiple videos and extract content
 */
router.post('/process-batch', upload.array('videos', 10), aiVideoController.processBatchVideos);

module.exports = router;
