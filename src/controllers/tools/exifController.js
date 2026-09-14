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

// ── Helper: In log metadata đẹp ra console ────────────────────────────────────

function printMetaLog(filename, log) {
  const { metaBefore, metaAfter, fieldsRemoved, sizeDiff, stripped } = log;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  🖼  EXIF Remover — ${filename}`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  📐 Kích thước : ${metaBefore.width}x${metaBefore.height}px | ${metaBefore.format?.toUpperCase()} | ${metaBefore.space}`);
  console.log(`║  📦 File size  : ${formatBytes(metaBefore.width)} → Trước: raw buffer`);
  console.log('╠══════════════════════════════════════════════════════╣');

  if (fieldsRemoved.length === 0) {
    console.log('║  ℹ️  Không tìm thấy metadata trong ảnh này');
  } else {
    console.log(`║  🔍 Metadata tìm thấy (${fieldsRemoved.length} loại):`);
    fieldsRemoved.forEach((f) => console.log(`║     ▸ ${f}`));
  }

  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  📊 Trước khi xoá:');
  console.log(`║     EXIF : ${metaBefore.hasEXIF ? `✅ Có (${metaBefore.exifSize} bytes)` : '❌ Không có'}`);
  console.log(`║     IPTC : ${metaBefore.hasIPTC ? `✅ Có (${metaBefore.iptcSize} bytes)` : '❌ Không có'}`);
  console.log(`║     XMP  : ${metaBefore.hasXMP  ? `✅ Có (${metaBefore.xmpSize} bytes)`  : '❌ Không có'}`);
  console.log(`║     ICC  : ${metaBefore.hasICC  ? `✅ Có (${metaBefore.iccSize} bytes)`  : '❌ Không có'}`);
  console.log('║  📊 Sau khi xoá:');
  console.log(`║     EXIF : ${metaAfter.hasEXIF ? `⚠️  Còn (${metaAfter.exifSize} bytes)` : '✅ Đã xoá'}`);
  console.log(`║     IPTC : ${metaAfter.hasIPTC ? `⚠️  Còn (${metaAfter.iptcSize} bytes)` : '✅ Đã xoá'}`);
  console.log(`║     XMP  : ${metaAfter.hasXMP  ? `⚠️  Còn (${metaAfter.xmpSize} bytes)`  : '✅ Đã xoá'}`);
  console.log(`║     ICC  : ${metaAfter.hasICC  ? `⚠️  Còn (${metaAfter.iccSize} bytes)`  : '✅ Đã xoá'}`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  📉 Dung lượng tiết kiệm: ${sizeDiff > 0 ? `${sizeDiff} bytes` : '0 (metadata không chiếm size sau encode lại)'}`);
  console.log(`║  ${stripped ? '✅ XOÁ METADATA THÀNH CÔNG' : '⚠️  Có thể còn sót metadata'}`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * POST /api/tools/exif/remove
 * Xoá EXIF khỏi 1 ảnh, trả về trực tiếp file đã clean
 */
const removeSingle = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'Vui lòng upload 1 ảnh', 400);
  }

  const { originalname, mimetype, buffer, size } = req.file;
  console.log(`\n🚀 [EXIF Remover] Bắt đầu xử lý: ${originalname} (${formatBytes(size)})`);

  const result = await removeExifFromBuffer(buffer, originalname, mimetype);

  if (!result.success) {
    console.error(`❌ [EXIF Remover] Lỗi: ${result.error}`);
    return errorResponse(res, `Xử lý ảnh thất bại: ${result.error}`, 500);
  }

  // In log chi tiết
  if (result.log) {
    printMetaLog(originalname, result.log);
  }

  console.log(`⏱  [EXIF Remover] Hoàn thành trong ${result.elapsed}ms | ${formatBytes(result.originalSize)} → ${formatBytes(result.cleanSize)}`);

  const contentType = mimetype || 'image/jpeg';
  const cleanFilename = addCleanSuffix(originalname);

  res.set({
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${cleanFilename}"`,
    'Content-Length': result.outputBuffer.length,
    'X-Original-Size': result.originalSize,
    'X-Clean-Size': result.cleanSize,
    'X-Elapsed-Ms': result.elapsed,
    'X-Metadata-Stripped': result.log?.stripped ? 'true' : 'false',
    'X-Fields-Removed': result.log?.fieldsRemoved?.join(',') || 'none',
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

  console.log(`\n🚀 [EXIF Remover Batch] Bắt đầu xử lý ${req.files.length} ảnh (đa luồng)`);

  const filesData = req.files.map((f) => ({
    buffer: f.buffer,
    filename: f.originalname,
    mimeType: f.mimetype,
  }));

  const results = await removeExifFromBuffers(filesData);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  // In log cho từng ảnh
  results.forEach((r) => {
    if (r.success && r.log) {
      printMetaLog(r.filename, r.log);
    } else if (!r.success) {
      console.error(`❌ [EXIF Batch] ${r.filename}: ${r.error}`);
    }
  });

  console.log(`\n📦 [EXIF Batch] Kết quả: ${successCount}/${results.length} thành công, ${failCount} lỗi`);

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
