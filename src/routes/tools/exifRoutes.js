/**
 * exifRoutes.js — Routes cho EXIF Metadata Remover tool
 *
 * GET  /api/tools/exif/info         — Thông tin service
 * POST /api/tools/exif/remove       — Xoá EXIF 1 ảnh
 * POST /api/tools/exif/remove-batch — Xoá EXIF nhiều ảnh (đa luồng)
 */
const express = require('express');
const multer = require('multer');
const { removeSingle, removeBatch, getInfo } = require('../../controllers/tools/exifController');

const router = express.Router();

// Lưu vào memory buffer (không ghi disk) để worker thread xử lý
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // Tối đa 20MB mỗi ảnh
    files: 20,                   // Tối đa 20 ảnh mỗi batch
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/avif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Định dạng không hỗ trợ: ${file.mimetype}`));
    }
  },
});

// Routes
router.get('/info', getInfo);
router.post('/remove', upload.single('image'), removeSingle);
router.post('/remove-batch', upload.array('images', 20), removeBatch);

module.exports = router;
