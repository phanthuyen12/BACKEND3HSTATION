const videoService = require('../services/videoService');
const crypto = require('crypto');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const env = require('../config/env');

const STREAM_PROXY_TTL_MS = 1000 * 60 * 15;
const streamSecret = crypto
  .createHash('sha256')
  .update(process.env.VIDEO_STREAM_PROXY_SECRET || env.jwt.secret || 'stream_proxy_secret')
  .digest();

const encryptToken = (payload) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', streamSecret, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
};

const decryptToken = (token) => {
  const raw = Buffer.from(token, 'base64url');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', streamSecret, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted);
};

const getProxyBaseUrl = (req, courseId, videoId) =>
  `${req.protocol}://${req.get('host')}/api/elearning/courses/${courseId}/videos/${videoId}/stream`;

const buildSignedProxyUrl = (req, courseId, videoId, targetUrl) => {
  const token = encryptToken({
    courseId: Number(courseId),
    videoId: Number(videoId),
    targetUrl,
    exp: Date.now() + STREAM_PROXY_TTL_MS,
  });

  return `${getProxyBaseUrl(req, courseId, videoId)}?token=${encodeURIComponent(token)}`;
};

const rewriteManifest = (manifest, req, courseId, videoId, currentTargetUrl) => {
  return manifest
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
          const resolvedUrl = new URL(uri, currentTargetUrl).toString();
          return `URI="${buildSignedProxyUrl(req, courseId, videoId, resolvedUrl)}"`;
        });
      }

      const resolvedUrl = new URL(trimmed, currentTargetUrl).toString();
      return buildSignedProxyUrl(req, courseId, videoId, resolvedUrl);
    })
    .join('\n');
};

const proxyVideoResponse = async (req, res, courseId, videoId, targetUrl) => {
  const upstreamHeaders = {};
  if (req.headers.range) {
    upstreamHeaders.Range = req.headers.range;
  }

  const upstream = await fetch(targetUrl, { headers: upstreamHeaders });
  if (!upstream.ok) {
    throw ApiError.badRequest(`Unable to load remote video asset (${upstream.status})`);
  }

  const contentType = upstream.headers.get('content-type') || '';
  const isManifest = targetUrl.includes('.m3u8') || /mpegurl|vnd\.apple\.mpegurl/i.test(contentType);

  res.status(upstream.status);
  [
    'content-type',
    'content-length',
    'accept-ranges',
    'content-range',
    'cache-control',
    'etag',
    'last-modified',
  ].forEach((header) => {
    const value = upstream.headers.get(header);
    if (value) {
      res.setHeader(header, value);
    }
  });

  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || env.app.frontendUrl || '*');
  res.setHeader('Vary', 'Origin');

  if (isManifest) {
    const manifest = await upstream.text();
    const rewritten = rewriteManifest(manifest, req, courseId, videoId, targetUrl);
    res.setHeader('content-type', 'application/vnd.apple.mpegurl');
    return res.send(rewritten);
  }

  const arrayBuffer = await upstream.arrayBuffer();
  return res.send(Buffer.from(arrayBuffer));
};

const listCourseVideos = asyncHandler(async (req, res) => {
  const sectionId = req.query.sectionId || req.query.section_id || null;
  const categoryId = req.query.categoryId || req.query.category_id || null;
  
  console.log('listCourseVideos controller - query params:', req.query);
  console.log('listCourseVideos controller - sectionId:', sectionId, 'categoryId:', categoryId);
  
  const videos = await videoService.listCourseVideos(
    req.params.course_id, 
    req.user || null,
    { 
      sectionId: sectionId ? parseInt(sectionId, 10) : null,
      categoryId: categoryId ? parseInt(categoryId, 10) : null
    }
  );
  
  console.log('listCourseVideos controller - videos result:', videos);
  return successResponse(res, videos);
});

const createVideo = asyncHandler(async (req, res) => {
  const video = await videoService.createVideo(req.params.course_id, req.body);
  return successResponse(res, { data: video }, 'Video created', 201);
});

const updateVideo = asyncHandler(async (req, res) => {
  const video = await videoService.updateVideo(req.params.id, req.body);
  return successResponse(res, { data: video }, 'Video updated');
});

const deleteVideo = asyncHandler(async (req, res) => {
  await videoService.deleteVideo(req.params.id);
  return successResponse(res, {}, 'Video deleted');
});

const streamCourseVideo = asyncHandler(async (req, res) => {
  const courseId = Number(req.params.course_id);
  const videoId = Number(req.params.id);
  const token = typeof req.query.token === 'string' ? req.query.token : null;

  await videoService.getCourseVideoPlaybackSource(courseId, videoId, req.user || null);

  let targetUrl;
  if (token) {
    let payload;
    try {
      payload = decryptToken(token);
    } catch (_error) {
      throw ApiError.forbidden('Invalid stream token');
    }

    if (payload.exp < Date.now()) {
      throw ApiError.forbidden('Stream token expired');
    }

    if (Number(payload.courseId) !== courseId || Number(payload.videoId) !== videoId) {
      throw ApiError.forbidden('Invalid stream token scope');
    }

    targetUrl = payload.targetUrl;
  } else {
    const video = await videoService.getCourseVideoPlaybackSource(courseId, videoId, req.user || null);
    targetUrl = video.url;
  }

  if (!/^https?:\/\//i.test(targetUrl || '')) {
    throw ApiError.badRequest('Invalid video source URL');
  }

  return proxyVideoResponse(req, res, courseId, videoId, targetUrl);
});

module.exports = {
  listCourseVideos,
  streamCourseVideo,
  createVideo,
  updateVideo,
  deleteVideo
};











