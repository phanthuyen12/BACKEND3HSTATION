/**
 * exifWorker.js — Worker Thread cho việc xoá EXIF metadata
 * Mỗi worker nhận 1 buffer ảnh, đọc metadata, xoá sạch, trả về buffer + log chi tiết.
 */
const { workerData, parentPort } = require('worker_threads');
const sharp = require('sharp');

async function removeExif() {
  const { inputBuffer, filename, mimeType } = workerData;
  const startTime = Date.now();

  try {
    const buffer = Buffer.from(inputBuffer);

    // ── Bước 1: Đọc metadata TRƯỚC khi xoá ──────────────────────────────────
    const metaBefore = await sharp(buffer).metadata();

    // Tóm tắt metadata tìm thấy
    const foundFields = [];
    if (metaBefore.exif)        foundFields.push(`EXIF (${metaBefore.exif.length} bytes)`);
    if (metaBefore.iptc)        foundFields.push(`IPTC (${metaBefore.iptc.length} bytes)`);
    if (metaBefore.xmp)         foundFields.push(`XMP (${metaBefore.xmp.length} bytes)`);
    if (metaBefore.icc)         foundFields.push(`ICC Profile (${metaBefore.icc.length} bytes)`);
    if (metaBefore.tifftagPhotoshop) foundFields.push('Photoshop TIFF tags');

    const metaLog = {
      format: metaBefore.format,
      width: metaBefore.width,
      height: metaBefore.height,
      space: metaBefore.space,
      hasAlpha: metaBefore.hasAlpha,
      density: metaBefore.density,
      orientation: metaBefore.orientation,
      // Metadata fields
      hasEXIF: !!metaBefore.exif,
      hasIPTC: !!metaBefore.iptc,
      hasXMP:  !!metaBefore.xmp,
      hasICC:  !!metaBefore.icc,
      exifSize: metaBefore.exif ? metaBefore.exif.length : 0,
      iptcSize: metaBefore.iptc ? metaBefore.iptc.length : 0,
      xmpSize:  metaBefore.xmp  ? metaBefore.xmp.length  : 0,
      iccSize:  metaBefore.icc  ? metaBefore.icc.length  : 0,
      foundFields,
    };

    // ── Bước 2: Strip toàn bộ metadata ───────────────────────────────────────
    // QUAN TRỌNG: KHÔNG gọi .withMetadata() = sharp tự động xoá tất cả
    const strippedBuffer = await sharp(buffer)
      .toFormat(getFormat(mimeType))
      .toBuffer();

    // ── Bước 3: Verify metadata SAU khi xoá ──────────────────────────────────
    const metaAfter = await sharp(strippedBuffer).metadata();

    const metaAfterLog = {
      hasEXIF: !!metaAfter.exif,
      hasIPTC: !!metaAfter.iptc,
      hasXMP:  !!metaAfter.xmp,
      hasICC:  !!metaAfter.icc,
      exifSize: metaAfter.exif ? metaAfter.exif.length : 0,
      iptcSize: metaAfter.iptc ? metaAfter.iptc.length : 0,
      xmpSize:  metaAfter.xmp  ? metaAfter.xmp.length  : 0,
      iccSize:  metaAfter.icc  ? metaAfter.icc.length  : 0,
    };

    const elapsed = Date.now() - startTime;
    const success = !metaAfter.exif && !metaAfter.iptc && !metaAfter.xmp;

    parentPort.postMessage({
      success: true,
      filename,
      outputBuffer: strippedBuffer,
      originalSize: buffer.length,
      cleanSize: strippedBuffer.length,
      elapsed,
      // Raw buffers cho IPTC decode + AI detection
      rawMeta: {
        iptc: metaBefore.iptc ? Array.from(metaBefore.iptc) : null,
        xmp:  metaBefore.xmp  ? Array.from(metaBefore.xmp)  : null,
      },
      // Log chi tiết để in ra console
      log: {
        metaBefore: metaLog,
        metaAfter: metaAfterLog,
        stripped: success,
        fieldsRemoved: foundFields,
        sizeDiff: buffer.length - strippedBuffer.length,
      },
    });

  } catch (err) {
    parentPort.postMessage({
      success: false,
      filename,
      error: err.message,
    });
  }
}

/**
 * Lấy format sharp từ MIME type
 */
function getFormat(mimeType) {
  const map = {
    'image/jpeg': 'jpeg',
    'image/jpg':  'jpeg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/tiff': 'tiff',
    'image/gif':  'gif',
    'image/avif': 'avif',
  };
  return map[mimeType] || 'jpeg';
}

removeExif();
