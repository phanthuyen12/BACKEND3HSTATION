const express = require('express');
const Joi = require('joi');
const {
  authenticate,
  authorizeRoles,
  optionalAuth
} = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const courseSectionController = require('../controllers/courseSectionController');

const router = express.Router();

// Lấy danh sách sections theo course_id
router.get(
  '/courses/:course_id/sections',
  // optionalAuth,
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required()
    })
  }),
  courseSectionController.getSectionsByCourse
);

// Lấy chi tiết một section - hỗ trợ cả 2 format
// Format 1: /api/elearning/sections/:id
router.get(
  '/sections/:id',
  // optionalAuth,
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  courseSectionController.getSectionById
);

// Format 2: /api/elearning/courses/:course_id/sections/:id
router.get(
  '/courses/:course_id/sections/:id',
  // optionalAuth,
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required(),
      id: Joi.number().integer().positive().required()
    })
  }),
  courseSectionController.getSectionById
);

// Tạo section mới cho course
router.post(
  '/courses/:course_id/sections',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      title: Joi.string().min(1).max(255).required(),
      order: Joi.number().integer().min(0).optional()
    })
  }),
  courseSectionController.createSection
);

// Cập nhật section - hỗ trợ cả 2 format
// Format 1: /api/elearning/sections/:id
router.put(
  '/sections/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      title: Joi.string().min(1).max(255).optional(),
      order: Joi.number().integer().min(0).optional()
    })
  }),
  courseSectionController.updateSection
);

// Format 2: /api/elearning/courses/:course_id/sections/:id
router.put(
  '/courses/:course_id/sections/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required(),
      id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      title: Joi.string().min(1).max(255).optional(),
      order: Joi.number().integer().min(0).optional()
    })
  }),
  courseSectionController.updateSection
);

// Xóa section - hỗ trợ cả 2 format
// Format 1: /api/elearning/sections/:id
router.delete(
  '/sections/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  courseSectionController.deleteSection
);

// Format 2: /api/elearning/courses/:course_id/sections/:id
router.delete(
  '/courses/:course_id/sections/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required(),
      id: Joi.number().integer().positive().required()
    })
  }),
  courseSectionController.deleteSection
);

module.exports = router;







