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

// ── IPTC Tag decoder ─────────────────────────────────────────────────────────
// Ref: https://www.iptc.org/std/IIM/4.2/specification/IIMV4.2.pdf

const IPTC_TAGS = {
  5:  'Object Name',
  7:  'Edit Status',
  10: 'Urgency',
  12: 'Subject Reference',
  15: 'Category',
  20: 'Supplemental Category',
  22: 'Fixture Identifier',
  25: 'Keywords',
  26: 'Content Location Code',
  27: 'Content Location Name',
  30: 'Release Date',
  35: 'Release Time',
  37: 'Expiration Date',
  38: 'Expiration Time',
  40: 'Special Instructions',
  42: 'Action Advised',
  45: 'Reference Service',
  47: 'Reference Date',
  50: 'Reference Number',
  55: 'Date Created',
  60: 'Time Created',
  62: 'Digital Creation Date',
  63: 'Digital Creation Time',
  65: 'Originating Program',
  70: 'Program Version',
  75: 'Object Cycle',
  80: 'By-line (Author)',
  85: 'By-line Title',
  90: 'City',
  92: 'Sub-location',
  95: 'Province/State',
  100: 'Country Code',
  101: 'Country',
  103: 'Original Transmission Reference',
  105: 'Headline',
  110: 'Credit',
  115: 'Source',
  116: 'Copyright Notice',
  118: 'Contact',
  120: 'Caption/Abstract',
  122: 'Caption Writer',
  130: 'Image Type',
  131: 'Image Orientation',
  135: 'Language Identifier',
};

function decodeIptc(buffer) {
  const fields = [];
  if (!buffer || buffer.length < 3) return fields;

  let i = 0;
  while (i < buffer.length - 4) {
    if (buffer[i] !== 0x1c) { i++; continue; }
    const record = buffer[i + 1];
    const tag    = buffer[i + 2];
    const len    = (buffer[i + 3] << 8) | buffer[i + 4];
    i += 5;
    if (record !== 2) { i += len; continue; }
    const value = buffer.slice(i, i + len).toString('utf8').replace(/\x00/g, '').trim();
    i += len;
    if (value) {
      fields.push({ tag, name: IPTC_TAGS[tag] || `Tag ${tag}`, value });
    }
  }
  return fields;
}

// ── AI Detection heuristics ───────────────────────────────────────────────────

function detectAiHints(metaBefore, iptcFields, xmpBuffer) {
  const hints = [];
  const safe  = [];

  // 1. Không có EXIF = không có camera data (dấu hiệu AI)
  if (!metaBefore.hasEXIF) hints.push('Không có EXIF camera data');
  else safe.push('Có EXIF camera data (ảnh thật thường có)');

  // 2. Kiểm tra XMP có chứa AI tools không
  if (xmpBuffer) {
    const xmpStr = xmpBuffer.toString('utf8');
    const aiKeywords = ['midjourney', 'stable diffusion', 'dall-e', 'firefly',
                        'generativeai', 'ai:generated', 'com.adobe.firefly',
                        'synthid', 'c2pa', 'stableDiffusion'];
    aiKeywords.forEach((kw) => {
      if (xmpStr.toLowerCase().includes(kw.toLowerCase())) {
        hints.push(`XMP chứa "${kw}" — dấu hiệu AI rõ ràng!`);
      }
    });
  }

  // 3. IPTC Source / Credit
  const source = iptcFields.find((f) => f.tag === 115)?.value || '';
  const credit = iptcFields.find((f) => f.tag === 110)?.value || '';
  const caption = iptcFields.find((f) => f.tag === 120)?.value || '';
  const prog = iptcFields.find((f) => f.tag === 65)?.value || '';

  ['midjourney','stable diffusion','dall-e','openai','firefly','ai generated']
    .forEach((kw) => {
      [source, credit, caption, prog].forEach((field) => {
        if (field.toLowerCase().includes(kw)) hints.push(`IPTC chứa "${kw}"`);
      });
    });

  if (source.toLowerCase().includes('facebook') || credit.toLowerCase().includes('facebook')) {
    safe.push('Source/Credit là Facebook (platform tự thêm IPTC)');
  }

  // 4. Size nhỏ, không có metadata = platform đã strip (Facebook, Twitter)
  if (!metaBefore.hasEXIF && !metaBefore.hasXMP && metaBefore.hasIPTC) {
    safe.push('Pattern: Facebook/platform strip EXIF nhưng giữ IPTC — ảnh thật bình thường');
  }

  return { hints, safe };
}

// ── Helper: In log metadata đẹp ra console ────────────────────────────────────

function printMetaLog(filename, log, rawMeta) {
  const { metaBefore, metaAfter, fieldsRemoved, sizeDiff, stripped } = log;

  // Decode IPTC nếu có
  const iptcFields = rawMeta?.iptc ? decodeIptc(rawMeta.iptc) : [];
  const { hints, safe } = detectAiHints(metaBefore, iptcFields, rawMeta?.xmp);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  🖼  EXIF Remover — ${filename}`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  📐 Kích thước : ${metaBefore.width}x${metaBefore.height}px | ${(metaBefore.format||'').toUpperCase()} | ${metaBefore.space||''}`);
  console.log('╠══════════════════════════════════════════════════════╣');

  if (fieldsRemoved.length === 0) {
    console.log('║  ℹ️  Không tìm thấy metadata trong ảnh này');
  } else {
    console.log(`║  🔍 Metadata tìm thấy (${fieldsRemoved.length} loại):`);
    fieldsRemoved.forEach((f) => console.log(`║     ▸ ${f}`));
  }

  // IPTC decoded fields
  if (iptcFields.length > 0) {
    console.log('║  📋 Nội dung IPTC:');
    iptcFields.forEach((f) => console.log(`║     [${String(f.tag).padStart(3)}] ${f.name}: ${f.value}`));
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

  // AI Detection
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  🤖 Phân tích AI detection:');
  if (hints.length === 0 && safe.length > 0) {
    console.log('║  ✅ Nhiều khả năng là ảnh THẬT (không có dấu hiệu AI):');
    safe.forEach((s) => console.log(`║     ✔ ${s}`));
  } else if (hints.length > 0) {
    console.log('║  ⚠️  Có dấu hiệu ảnh AI:');
    hints.forEach((h) => console.log(`║     ▸ ${h}`));
    if (safe.length > 0) {
      console.log('║  ℹ️  Nhưng cũng có dấu hiệu thật:');
      safe.forEach((s) => console.log(`║     ✔ ${s}`));
    }
  } else {
    console.log('║     ❓ Không đủ dữ liệu để kết luận');
  }

  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  📉 Dung lượng tiết kiệm: ${sizeDiff > 0 ? sizeDiff + ' bytes' : '0 (re-encode)'}`);
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
    printMetaLog(originalname, result.log, result.rawMeta);
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
      printMetaLog(r.filename, r.log, r.rawMeta);
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
