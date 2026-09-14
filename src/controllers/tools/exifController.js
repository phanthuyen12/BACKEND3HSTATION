/**
 * exifController.js — Controller xử lý xoá EXIF metadata
 *
 * POST /api/tools/exif/remove       — 1 ảnh → trả về file ảnh sạch
 * POST /api/tools/exif/remove-batch — Nhiều ảnh → trả về file ZIP
 */
const archiver = require('archiver');
const asyncHandler = require('../../utils/asyncHandler');
const { errorResponse } = require('../../utils/response');
const { removeExifFromBuffer, removeExifFromBuffers } = require('../../services/exifRemover.service');

/**
 * POST /api/tools/exif/remove
 * Xoá EXIF khỏi 1 ảnh, trả về trực tiếp file đã clean
 */
const removeSingle = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'Vui lòng upload 1 ảnh', 400);
  }

  const { originalname, mimetype, buffer } = req.file;

  const result = await removeExifFromBuffer(buffer, originalname, mimetype);

  if (!result.success) {
    return errorResponse(res, `Xử lý ảnh thất bại: ${result.error}`, 500);
  }

  // Xác định Content-Type đúng
  const contentType = mimetype || 'image/jpeg';
  const cleanFilename = addCleanSuffix(originalname);

  res.set({
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${cleanFilename}"`,
    'Content-Length': result.outputBuffer.length,
    'X-Original-Size': result.originalSize,
    'X-Clean-Size': result.cleanSize,
  });

  return res.send(result.outputBuffer);
});

/**
 * POST /api/tools/exif/remove-batch
 * Xoá EXIF khỏi nhiều ảnh (đa luồng), trả về file ZIP
 */
const removeBatch = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return errorResponse(res, 'Vui lòng upload ít nhất 1 ảnh', 400);
  }

  if (req.files.length > 20) {
    return errorResponse(res, 'Tối đa 20 ảnh mỗi lần', 400);
  }

  // Chuẩn bị data cho worker threads
  const filesData = req.files.map((f) => ({
    buffer: f.buffer,
    filename: f.originalname,
    mimeType: f.mimetype,
  }));

  // Xử lý đa luồng song song
  const results = await removeExifFromBuffers(filesData);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  // Tạo ZIP chứa tất cả ảnh đã xoá EXIF
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="exif_cleaned_${Date.now()}.zip"`,
    'X-Success-Count': successCount,
    'X-Fail-Count': failCount,
  });

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(res);

  results.forEach((result) => {
    if (result.success) {
      archive.append(result.outputBuffer, {
        name: addCleanSuffix(result.filename),
      });
    }
  });

  // Thêm file log nếu có lỗi
  if (failCount > 0) {
    const failLog = results
      .filter((r) => !r.success)
      .map((r) => `${r.filename}: ${r.error}`)
      .join('\n');
    archive.append(failLog, { name: 'errors.txt' });
  }

  await archive.finalize();
});

/**
 * GET /api/tools/exif/info
 * Trả về thông tin về service (số luồng tối đa, v.v.)
 */
const getInfo = asyncHandler(async (_req, res) => {
  const { MAX_CONCURRENCY } = require('../../services/exifRemover.service');
  const os = require('os');

  return res.json({
    success: true,
    data: {
      service: 'EXIF Metadata Remover',
      maxConcurrency: MAX_CONCURRENCY,
      cpuCount: os.cpus().length,
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/avif'],
      maxBatchSize: 20,
    },
  });
});

/**
 * Helper: Thêm "_clean" vào tên file trước extension
 */
function addCleanSuffix(filename) {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return `${filename}_clean`;
  return `${filename.slice(0, lastDot)}_clean${filename.slice(lastDot)}`;
}

module.exports = { removeSingle, removeBatch, getInfo };
