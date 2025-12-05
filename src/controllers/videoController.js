const videoService = require('../services/videoService');
const { successResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

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

module.exports = {
  listCourseVideos,
  createVideo,
  updateVideo,
  deleteVideo
};












