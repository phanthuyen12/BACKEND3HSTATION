/**
 * exifWorker.js — Worker Thread cho việc xoá EXIF metadata
 * Mỗi worker nhận 1 buffer ảnh, xoá EXIF, trả về buffer sạch.
 */
const { workerData, parentPort } = require('worker_threads');
const sharp = require('sharp');

async function removeExif() {
  const { inputBuffer, filename, mimeType } = workerData;

  try {
    const buffer = Buffer.from(inputBuffer);

    // sharp tự động strip metadata khi withMetadata() không được gọi
    const cleanBuffer = await sharp(buffer)
      .withMetadata({
        // Chỉ giữ lại orientation để ảnh không bị xoay, xoá phần còn lại
        orientation: undefined,
      })
      // withMetadata({}) sẽ strip tất cả — ta gọi không có tham số để xoá toàn bộ
      // Thực ra sharp mặc định KHÔNG copy metadata, ta chỉ cần không gọi .withMetadata()
      .toBuffer();

    // Rebuild image mà không có bất kỳ metadata nào
    const strippedBuffer = await sharp(buffer)
      .toFormat(getFormat(mimeType))
      .toBuffer();

    parentPort.postMessage({
      success: true,
      filename,
      outputBuffer: strippedBuffer,
      originalSize: buffer.length,
      cleanSize: strippedBuffer.length,
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
    'image/jpg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/tiff': 'tiff',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  return map[mimeType] || 'jpeg';
}

removeExif();
