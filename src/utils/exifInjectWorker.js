/**
 * exifInjectWorker.js — Worker Thread giả lập EXIF metadata
 * Inject metadata từ các thiết bị thật vào ảnh AI để trông như ảnh chụp thật.
 */
const { workerData, parentPort } = require('worker_threads');
const sharp = require('sharp');
const piexif = require('piexifjs');

// ── Bộ profile thiết bị thật ──────────────────────────────────────────────────

const DEVICE_PROFILES = {
  'iphone_15': {
    label: 'Apple iPhone 15',
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
  },
  'iphone_15_pro': {
    label: 'Apple iPhone 15 Pro',
    make: 'Apple',
    model: 'iPhone 15 Pro',
    software: '17.5.1',
    lens: 'iPhone 15 Pro back triple camera 6.765mm f/1.78',
    lensMake: 'Apple',
    focalLength: [6765, 1000],
    focalLength35mm: 24,
    fNumber: [178, 100],           // f/1.78
    exposureTime: [1, 100],
    iso: 50,
    shutterSpeed: [664, 100],
    aperture: [168, 100],
    brightness: [700, 100],
    flash: 24,
    meteringMode: 5,
    exposureProgram: 2,
    whiteBalance: 0,
    xResolution: [72, 1],
    yResolution: [72, 1],
  },
  'samsung_s24': {
    label: 'Samsung Galaxy S24',
    make: 'samsung',
    model: 'SM-S921B',
    software: 'S921BXXS2AXF1',
    lens: 'Wide Camera',
    lensMake: 'Samsung',
    focalLength: [62, 10],         // 6.2mm
    focalLength35mm: 23,
    fNumber: [18, 10],             // f/1.8
    exposureTime: [1, 100],
    iso: 50,
    shutterSpeed: [664, 100],
    aperture: [170, 100],
    brightness: [650, 100],
    flash: 0,
    meteringMode: 2,               // Center-weighted
    exposureProgram: 2,
    whiteBalance: 0,
    xResolution: [72, 1],
    yResolution: [72, 1],
  },
  'pixel_8': {
    label: 'Google Pixel 8',
    make: 'Google',
    model: 'Pixel 8',
    software: 'AP2A.240805.005',
    lens: 'Google Pixel 8 back main camera 5.4mm f/1.68',
    lensMake: 'Google',
    focalLength: [54, 10],         // 5.4mm
    focalLength35mm: 24,
    fNumber: [168, 100],           // f/1.68
    exposureTime: [1, 120],
    iso: 54,
    shutterSpeed: [732, 100],
    aperture: [132, 100],
    brightness: [590, 100],
    flash: 0,
    meteringMode: 5,
    exposureProgram: 2,
    whiteBalance: 0,
    xResolution: [72, 1],
    yResolution: [72, 1],
  },
};

// ── Helper: tạo datetime string ngẫu nhiên gần đây ───────────────────────────

function randomRecentDatetime(daysBack = 30) {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * daysBack * 24 * 3600 * 1000);
  const d = new Date(past);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function injectExif() {
  const { inputBuffer, filename, deviceKey, customDatetime, addGps, gpsLat, gpsLon } = workerData;

  try {
    const buffer = Buffer.from(inputBuffer);
    const profile = DEVICE_PROFILES[deviceKey] || DEVICE_PROFILES['iphone_15'];
    const datetime = customDatetime || randomRecentDatetime(30);

    // Bước 1: Chuyển ảnh sang JPEG (piexifjs chỉ làm việc với JPEG)
    const meta = await sharp(buffer).metadata();
    const jpegBuffer = await sharp(buffer)
      .jpeg({ quality: 95 })
      .toBuffer();

    const width = meta.width || 1024;
    const height = meta.height || 1024;

    // Bước 2: Xây dựng EXIF object
    const exifObj = {
      '0th': {
        [piexif.ImageIFD.Make]: profile.make,
        [piexif.ImageIFD.Model]: profile.model,
        [piexif.ImageIFD.Software]: profile.software,
        [piexif.ImageIFD.DateTime]: datetime,
        [piexif.ImageIFD.Orientation]: 1,
        [piexif.ImageIFD.XResolution]: profile.xResolution,
        [piexif.ImageIFD.YResolution]: profile.yResolution,
        [piexif.ImageIFD.ResolutionUnit]: 2,
        [piexif.ImageIFD.YCbCrPositioning]: 1,
      },
      'Exif': {
        [piexif.ExifIFD.ExposureTime]: profile.exposureTime,
        [piexif.ExifIFD.FNumber]: profile.fNumber,
        [piexif.ExifIFD.ExposureProgram]: profile.exposureProgram,
        [piexif.ExifIFD.ISOSpeedRatings]: profile.iso,
        [piexif.ExifIFD.DateTimeOriginal]: datetime,
        [piexif.ExifIFD.DateTimeDigitized]: datetime,
        [piexif.ExifIFD.ShutterSpeedValue]: profile.shutterSpeed,
        [piexif.ExifIFD.ApertureValue]: profile.aperture,
        [piexif.ExifIFD.BrightnessValue]: profile.brightness,
        [piexif.ExifIFD.ExposureBiasValue]: [0, 1],
        [piexif.ExifIFD.MeteringMode]: profile.meteringMode,
        [piexif.ExifIFD.Flash]: profile.flash,
        [piexif.ExifIFD.FocalLength]: profile.focalLength,
        [piexif.ExifIFD.ColorSpace]: 1,
        [piexif.ExifIFD.PixelXDimension]: width,
        [piexif.ExifIFD.PixelYDimension]: height,
        [piexif.ExifIFD.SensingMethod]: 2,
        [piexif.ExifIFD.ExposureMode]: 0,
        [piexif.ExifIFD.WhiteBalance]: profile.whiteBalance,
        [piexif.ExifIFD.FocalLengthIn35mmFilm]: profile.focalLength35mm,
        [piexif.ExifIFD.SceneCaptureType]: 0,
        [piexif.ExifIFD.LensMake]: profile.lensMake,
        [piexif.ExifIFD.LensModel]: profile.lens,
      },
      'GPS': {},
      '1st': {},
    };

    // Bước 3: Thêm GPS nếu yêu cầu
    if (addGps && gpsLat !== undefined && gpsLon !== undefined) {
      const lat = parseFloat(gpsLat);
      const lon = parseFloat(gpsLon);
      exifObj['GPS'] = {
        [piexif.GPSIFD.GPSLatitudeRef]: lat >= 0 ? 'N' : 'S',
        [piexif.GPSIFD.GPSLatitude]: decimalToDms(Math.abs(lat)),
        [piexif.GPSIFD.GPSLongitudeRef]: lon >= 0 ? 'E' : 'W',
        [piexif.GPSIFD.GPSLongitude]: decimalToDms(Math.abs(lon)),
        [piexif.GPSIFD.GPSAltitudeRef]: 0,
        [piexif.GPSIFD.GPSAltitude]: [10, 1],
        [piexif.GPSIFD.GPSTimeStamp]: [
          [parseInt(datetime.slice(11, 13)), 1],
          [parseInt(datetime.slice(14, 16)), 1],
          [parseInt(datetime.slice(17, 19)), 1],
        ],
        [piexif.GPSIFD.GPSDateStamp]: datetime.slice(0, 10).replace(/:/g, ':'),
      };
    }

    // Bước 4: Chuyển EXIF object → binary string → inject vào JPEG
    const exifBytes = piexif.dump(exifObj);
    const jpegStr = jpegBuffer.toString('binary');
    const injectedStr = piexif.insert(exifBytes, jpegStr);
    const injectedBuffer = Buffer.from(injectedStr, 'binary');

    // Bước 5: Verify EXIF đã được inject
    const verifyMeta = await sharp(injectedBuffer).metadata();

    parentPort.postMessage({
      success: true,
      filename,
      outputBuffer: injectedBuffer,
      originalSize: buffer.length,
      injectedSize: injectedBuffer.length,
      device: profile.label,
      datetime,
      hasExif: !!verifyMeta.exif,
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
 * Chuyển decimal degrees → DMS format cho GPS EXIF
 */
function decimalToDms(decimal) {
  const degrees = Math.floor(decimal);
  const minutesFloat = (decimal - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 6000);
  return [[degrees, 1], [minutes, 1], [seconds, 100]];
}

injectExif();
