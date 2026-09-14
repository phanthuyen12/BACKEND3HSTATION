/**
 * exifRemover.service.js — Service xoá EXIF metadata với Worker Threads (đa luồng)
 *
 * Mỗi ảnh được xử lý bởi 1 Worker Thread riêng biệt, chạy song song.
 * Giới hạn concurrency theo số CPU để tránh quá tải.
 */
const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');

const WORKER_SCRIPT = path.join(__dirname, '../utils/exifWorker.js');
const MAX_CONCURRENCY = Math.max(os.cpus().length - 1, 2); // Tối thiểu 2 luồng

/**
 * Xoá EXIF khỏi 1 file bằng Worker Thread
 * @param {Buffer} inputBuffer - Buffer của ảnh gốc
 * @param {string} filename - Tên file
 * @param {string} mimeType - MIME type của ảnh
 * @returns {Promise<{success, filename, outputBuffer, originalSize, cleanSize}>}
 */
function removeExifFromBuffer(inputBuffer, filename, mimeType) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_SCRIPT, {
      workerData: {
        // Chuyển Buffer thành ArrayBuffer để truyền qua worker
        inputBuffer: inputBuffer.buffer.slice(
          inputBuffer.byteOffset,
          inputBuffer.byteOffset + inputBuffer.byteLength
        ),
        filename,
        mimeType,
      },
      // Transferable objects — zero-copy transfer sang worker
      transferList: [
        inputBuffer.buffer.slice(
          inputBuffer.byteOffset,
          inputBuffer.byteOffset + inputBuffer.byteLength
        ),
      ],
    });

    worker.on('message', (result) => {
      if (result.success) {
        result.outputBuffer = Buffer.from(result.outputBuffer);
        // Convert Array → Buffer cho rawMeta
        if (result.rawMeta) {
          if (result.rawMeta.iptc) result.rawMeta.iptc = Buffer.from(result.rawMeta.iptc);
          if (result.rawMeta.xmp)  result.rawMeta.xmp  = Buffer.from(result.rawMeta.xmp);
        }
      }
      resolve(result);
    });

    worker.on('error', (err) => {
      reject(err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

/**
 * Xoá EXIF khỏi nhiều files với concurrency control
 * @param {Array<{buffer: Buffer, filename: string, mimeType: string}>} files
 * @returns {Promise<Array<{success, filename, outputBuffer?, originalSize?, cleanSize?, error?}>>}
 */
async function removeExifFromBuffers(files) {
  const results = [];
  
  // Xử lý theo batch để giới hạn số luồng song song
  for (let i = 0; i < files.length; i += MAX_CONCURRENCY) {
    const batch = files.slice(i, i + MAX_CONCURRENCY);
    
    // Chạy song song tất cả files trong batch
    const batchResults = await Promise.allSettled(
      batch.map(({ buffer, filename, mimeType }) =>
        removeExifFromBuffer(buffer, filename, mimeType)
      )
    );
    
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          filename: batch[idx].filename,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });
  }
  
  return results;
}

module.exports = {
  removeExifFromBuffer,
  removeExifFromBuffers,
  MAX_CONCURRENCY,
};
