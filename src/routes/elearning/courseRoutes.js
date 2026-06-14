const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles, optionalAuth } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const courseController = require('../../controllers/elearning/courseController');
const videoController = require('../../controllers/videoController');

const router = express.Router();

// GET /api/elearning/courses - Lấy danh sách khoá học với phân trang và tìm kiếm
router.get(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      search: Joi.string().allow('').optional(),
      category: Joi.string().optional()
    })
  }),
  courseController.listCourses
);

// GET /api/elearning/courses/:id - Lấy chi tiết một khoá học
router.get(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  courseController.getCourseById
);

// POST /api/elearning/courses - Tạo khoá học mới
router.post(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    body: Joi.object({
      title: Joi.string().required(),
      shortDescription: Joi.string().optional(),
      description: Joi.string().required(),
      categoryId: Joi.string().required(),
      thumbnail: Joi.string().allow('', null).optional(),
      price: Joi.string().allow('', null).optional(),
      level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
      duration: Joi.string().optional(),
      lessons: Joi.number().integer().min(0).optional(),
      content: Joi.string().allow('', null).optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  courseController.createCourse
);

// PUT /api/elearning/courses/:id - Cập nhật thông tin khoá học
router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      title: Joi.string().optional(),
      shortDescription: Joi.string().optional(),
      description: Joi.string().optional(),
      categoryId: Joi.string().optional(),
      thumbnail: Joi.string().allow('', null).optional(),
      price: Joi.string().optional(),
      level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
      duration: Joi.string().optional(),
      lessons: Joi.number().integer().min(0).optional(),
      content: Joi.string().allow('', null).optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  courseController.updateCourse
);

// DELETE /api/elearning/courses/:id - Xóa khoá học
router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  courseController.deleteCourse
);

// GET /api/elearning/courses/stats - Lấy thống kê khoá học
router.get(
  '/stats',
  // authenticate,
  // authorizeRoles('admin'),
  courseController.getStats
);

// Video routes - Videos belong to course_sections
// GET /api/elearning/courses/:course_id/videos - Lấy danh sách videos theo khoá học
router.get(
  '/:course_id/videos',
  optionalAuth, // Cho phép optional auth để kiểm tra enrollment
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required()
    }),
    query: Joi.object({
      sectionId: Joi.number().integer().positive().optional(),
      section_id: Joi.number().integer().positive().optional(),
      categoryId: Joi.number().integer().positive().optional(),
      category_id: Joi.number().integer().positive().optional()
    })
  }),
  videoController.listCourseVideos
);

// GET /api/elearning/courses/:course_id/videos/:id/stream - Proxy protected HLS/video source
router.get(
  '/:course_id/videos/:id/stream',
  optionalAuth,
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required(),
      id: Joi.number().integer().positive().required()
    }),
    query: Joi.object({
      token: Joi.string().optional()
    })
  }),
  videoController.streamCourseVideo
);

// POST /api/elearning/courses/:course_id/videos - Tạo video mới cho section
router.post(
  '/:course_id/videos',
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      sectionId: Joi.number().integer().positive().required(),
      title: Joi.string().required(),
      url: Joi.string().uri().required(), // optional: validate URL
      duration: Joi.number().integer().min(0).required(),
      order: Joi.number().integer().min(0).required(),
      preview: Joi.boolean().required()
    })
  }),
  videoController.createVideo
);


// PUT /api/elearning/courses/:course_id/videos/:id - Cập nhật video
router.put(
  '/:course_id/videos/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required(),
      id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      sectionId: Joi.number().integer().positive().optional(),
      title: Joi.string().optional(),
      url: Joi.string().optional(),
      duration: Joi.number().integer().min(0).optional(),
      order: Joi.number().integer().min(0).optional(),
      preview: Joi.boolean().optional()
    })
  }),
  videoController.updateVideo
);

// DELETE /api/elearning/courses/:course_id/videos/:id - Xóa video
router.delete(
  '/:course_id/videos/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required(),
      id: Joi.number().integer().positive().required()
    })
  }),
  videoController.deleteVideo
);

module.exports = router;






