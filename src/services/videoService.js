const ApiError = require('../utils/apiError');
const courseModel = require('../models/courseModel');
const videoModel = require('../models/videoModel');
const courseSectionModel = require('../models/courseSectionModel');
const userCourseModel = require('../models/userCourseModel');

const canAccessCourseVideos = async (courseId, user) => {
  const course = await courseModel.getCourseById(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Admin luôn có quyền xem tất cả
  if (user && user.role === 'admin') {
    return { course, canViewFull: true };
  }

  // Nếu course miễn phí, ai cũng xem được
  if (course.is_free) {
    return { course, canViewFull: true };
  }

  // Nếu không có user, chỉ xem được preview
  if (!user) {
    return { course, canViewFull: false };
  }

  // Kiểm tra user có sở hữu course không
  const ownership = await userCourseModel.userHasActiveCourse(user.id, courseId);
  return { course, canViewFull: Boolean(ownership) };
};

const listCourseVideos = async (courseId, user, { sectionId = null, categoryId = null } = {}) => {
  const { canViewFull, course } = await canAccessCourseVideos(courseId, user);
  
  console.log('listCourseVideos service - user:', user ? { id: user.id, role: user.role } : 'null');
  console.log('listCourseVideos service - canViewFull:', canViewFull, 'course.is_free:', course?.is_free);
  
  // If categoryId is provided, validate course belongs to this category
  const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : null;
  if (parsedCategoryId) {
    if (course.category_id !== parsedCategoryId) {
      throw ApiError.badRequest('Course does not belong to this category');
    }
  }
  
  // If sectionId is provided, validate it belongs to the course
  const parsedSectionId = sectionId ? parseInt(sectionId, 10) : null;
  
  if (parsedSectionId) {
    const section = await courseSectionModel.getSectionById(parsedSectionId);
    if (!section) {
      throw ApiError.notFound('Section not found');
    }
    if (section.course_id !== parseInt(courseId, 10)) {
      throw ApiError.badRequest('Section does not belong to this course');
    }
  }
  
  // Nếu có sectionId cụ thể, có thể là admin đang quản lý nên cho xem tất cả videos
  // Chỉ filter preview khi không có sectionId và user không có quyền xem full
  const onlyPreview = !canViewFull && !parsedSectionId;
  
  const videos = await videoModel.getVideosByCourseId(parseInt(courseId, 10), { 
    onlyPreview: onlyPreview,
    sectionId: parsedSectionId,
    categoryId: parsedCategoryId
  });
  
  console.log('listCourseVideos service - courseId:', courseId, 'parsedSectionId:', parsedSectionId, 'onlyPreview:', onlyPreview, 'videos count:', videos?.length);
  return videos;
};

const createVideo = async (courseId, payload) => {
  const course = await courseModel.getCourseById(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Validate sectionId is provided and belongs to the course
  if (!payload.sectionId) {
    throw ApiError.badRequest('sectionId is required');
  }

  const section = await courseSectionModel.getSectionById(payload.sectionId);
  if (!section) {
    throw ApiError.notFound('Section not found');
  }
  
  if (section.course_id !== parseInt(courseId, 10)) {
    throw ApiError.badRequest('Section does not belong to this course');
  }

  const videoData = {
    courseId: parseInt(courseId, 10), 
    sectionId: parseInt(payload.sectionId, 10),
    title: payload.title,
    url: payload.url,
    duration: parseInt(payload.duration, 10),
    order: parseInt(payload.order, 10),
    preview: payload.preview ? 1 : 0
  };

  console.log('createVideo service - videoData:', videoData);
  
  const createdVideo = await videoModel.createVideo(videoData);
  
  console.log('createVideo service - createdVideo:', createdVideo);
  
  // Verify video was created by querying it back
  const verifyVideo = await videoModel.getVideoById(createdVideo.id);
  console.log('createVideo service - verifyVideo:', verifyVideo);
  
  return createdVideo;
};

const updateVideo = async (id, payload) => {
  const existing = await videoModel.getVideoById(id);
  if (!existing) {
    throw ApiError.notFound('Video not found');
  }

  // If sectionId is being updated, validate it belongs to the course
  if (payload.sectionId !== undefined) {
    const section = await courseSectionModel.getSectionById(payload.sectionId);
    if (!section) {
      throw ApiError.notFound('Section not found');
    }
    if (section.course_id !== existing.course_id) {
      throw ApiError.badRequest('Section does not belong to this course');
    }
  }

  // Map payload to model format
  const updateData = {
    sectionId: payload.sectionId,
    title: payload.title,
    url: payload.url,
    duration: payload.duration,
    order: payload.order,
    preview: payload.preview
  };

  return videoModel.updateVideo(id, updateData);
};

const deleteVideo = async (id) => {
  const existing = await videoModel.getVideoById(id);
  if (!existing) {
    throw ApiError.notFound('Video not found');
  }
  await videoModel.deleteVideo(id);
};

module.exports = {
  listCourseVideos,
  createVideo,
  updateVideo,
  deleteVideo
};












