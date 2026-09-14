const { workerData, parentPort } = require('worker_threads');
const sharp = require('sharp');
const piexif = require('piexifjs');

// ── Profile iPhone 15 cố định để inject vào mọi ảnh ───────────────────────────
const IPHONE_15 = {
  make: 'Apple',
  model: 'iPhone 15',
  software: '17.5.1',
  lens: 'iPhone 15 back camera 6.86mm f/1.6',
  lensMake: 'Apple',
  focalLength: [686, 100],       // 6.86mm
  focalLength35mm: 26,
  fNumber: [8, 5],               // f/1.6
  exposureTime: [1, 120],        // 1/120s
  iso: 64,
  shutterSpeed: [732, 100],
  aperture: [137, 100],
  brightness: [612, 100],
  flash: 24,                     // Auto, did not fire
  meteringMode: 5,               // Multi-segment
  exposureProgram: 2,            // Normal
  whiteBalance: 0,               // Auto
  xResolution: [72, 1],
  yResolution: [72, 1],
};

function randomRecentDatetime(daysBack = 30) {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * daysBack * 24 * 3600 * 1000);
  const d = new Date(past);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function removeExif() {
  const { inputBuffer, filename, mimeType } = workerData;
  const startTime = Date.now();

  try {
    const buffer = Buffer.from(inputBuffer);

    // ── Bước 1: Đọc metadata TRƯỚC khi xoá ──────────────────────────────────
    const metaBefore = await sharp(buffer).metadata();

    // Tóm tắt metadata tìm thấy
    const foundFields = [];
    if (metaBefore.exif)             foundFields.push(`EXIF (${metaBefore.exif.length} bytes)`);
    if (metaBefore.iptc)             foundFields.push(`IPTC (${metaBefore.iptc.length} bytes)`);
    if (metaBefore.xmp)              foundFields.push(`XMP (${metaBefore.xmp.length} bytes)`);
    if (metaBefore.icc)              foundFields.push(`ICC Profile (${metaBefore.icc.length} bytes)`);
    if (metaBefore.tifftagPhotoshop) foundFields.push('Photoshop TIFF tags');

    const metaLog = {
      format: metaBefore.format,
      width: metaBefore.width,
      height: metaBefore.height,
      space: metaBefore.space,
      hasAlpha: metaBefore.hasAlpha,
      density: metaBefore.density,
      orientation: metaBefore.orientation,
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

    // ── Bước 2: Strip toàn bộ metadata cũ và convert sang JPEG chuẩn ─────────
    const cleanJpegBuffer = await sharp(buffer)
      .jpeg({ quality: 95 })
      .toBuffer();

    const width = metaBefore.width || 1024;
    const height = metaBefore.height || 1024;
    const datetime = randomRecentDatetime(30);

    // ── Bước 3: Inject EXIF iPhone 15 thực tế vào ảnh ─────────────────────────
    const exifObj = {
      '0th': {
        [piexif.ImageIFD.Make]: IPHONE_15.make,
        [piexif.ImageIFD.Model]: IPHONE_15.model,
        [piexif.ImageIFD.Software]: IPHONE_15.software,
        [piexif.ImageIFD.DateTime]: datetime,
        [piexif.ImageIFD.Orientation]: 1,
        [piexif.ImageIFD.XResolution]: IPHONE_15.xResolution,
        [piexif.ImageIFD.YResolution]: IPHONE_15.yResolution,
        [piexif.ImageIFD.ResolutionUnit]: 2,
        [piexif.ImageIFD.YCbCrPositioning]: 1,
      },
      'Exif': {
        [piexif.ExifIFD.ExposureTime]: IPHONE_15.exposureTime,
        [piexif.ExifIFD.FNumber]: IPHONE_15.fNumber,
        [piexif.ExifIFD.ExposureProgram]: IPHONE_15.exposureProgram,
        [piexif.ExifIFD.ISOSpeedRatings]: IPHONE_15.iso,
        [piexif.ExifIFD.DateTimeOriginal]: datetime,
        [piexif.ExifIFD.DateTimeDigitized]: datetime,
        [piexif.ExifIFD.ShutterSpeedValue]: IPHONE_15.shutterSpeed,
        [piexif.ExifIFD.ApertureValue]: IPHONE_15.aperture,
        [piexif.ExifIFD.BrightnessValue]: IPHONE_15.brightness,
        [piexif.ExifIFD.ExposureBiasValue]: [0, 1],
        [piexif.ExifIFD.MeteringMode]: IPHONE_15.meteringMode,
        [piexif.ExifIFD.Flash]: IPHONE_15.flash,
        [piexif.ExifIFD.FocalLength]: IPHONE_15.focalLength,
        [piexif.ExifIFD.ColorSpace]: 1,
        [piexif.ExifIFD.PixelXDimension]: width,
        [piexif.ExifIFD.PixelYDimension]: height,
        [piexif.ExifIFD.SensingMethod]: 2,
        [piexif.ExifIFD.ExposureMode]: 0,
        [piexif.ExifIFD.WhiteBalance]: IPHONE_15.whiteBalance,
        [piexif.ExifIFD.FocalLengthIn35mmFilm]: IPHONE_15.focalLength35mm,
        [piexif.ExifIFD.SceneCaptureType]: 0,
        [piexif.ExifIFD.LensMake]: IPHONE_15.lensMake,
        [piexif.ExifIFD.LensModel]: IPHONE_15.lens,
      },
      'GPS': {},
      '1st': {},
    };

    const exifBytes = piexif.dump(exifObj);
    const jpegStr = cleanJpegBuffer.toString('binary');
    const finalInjectedStr = piexif.insert(exifBytes, jpegStr);
    const finalBuffer = Buffer.from(finalInjectedStr, 'binary');

    // ── Bước 4: Kiểm tra metadata sau khi hoàn tất ─────────────────────────────
    const metaAfter = await sharp(finalBuffer).metadata();

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

    parentPort.postMessage({
      success: true,
      filename,
      outputBuffer: finalBuffer,
      originalSize: buffer.length,
      cleanSize: finalBuffer.length,
      device: 'Apple iPhone 15',
      datetime,
      elapsed,
      rawMeta: {
        iptc: metaBefore.iptc ? Array.from(metaBefore.iptc) : null,
        xmp:  metaBefore.xmp  ? Array.from(metaBefore.xmp)  : null,
      },
      log: {
        metaBefore: metaLog,
        metaAfter: metaAfterLog,
        stripped: true,
        injectedDevice: 'Apple iPhone 15',
        fieldsRemoved: foundFields,
        sizeDiff: buffer.length - finalBuffer.length,
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

removeExif();
