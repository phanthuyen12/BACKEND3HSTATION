const express = require('express');
const Joi = require('joi');
const {
  authenticate,
  authorizeRoles,
  optionalAuth
} = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const courseLessonController = require('../controllers/courseLessonController');

const router = express.Router();

// Lấy danh sách lessons theo section_id
router.get(
  '/sections/:section_id/lessons',
  optionalAuth,
  validate({
    params: Joi.object({
      section_id: Joi.number().integer().positive().required()
    })
  }),
  courseLessonController.getLessonsBySection
);

// Lấy danh sách lessons theo course_id
router.get(
  '/courses/:course_id/lessons',
  optionalAuth,
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required()
    })
  }),
  courseLessonController.getLessonsByCourse
);

// Lấy chi tiết một lesson
router.get(
  '/lessons/:id',
  optionalAuth,
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  courseLessonController.getLessonById
);

// Tạo lesson mới cho section
router.post(
  '/sections/:section_id/lessons',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({
      section_id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      course_id: Joi.number().integer().positive().required(),
      title: Joi.string().min(1).max(255).required(),
      duration: Joi.string().allow('', null).optional(),
      type: Joi.string().valid('video', 'text', 'quiz').optional(),
      content: Joi.string().allow('', null).optional(),
      order: Joi.number().integer().min(0).optional()
    })
  }),
  courseLessonController.createLesson
);

// Cập nhật lesson
router.put(
  '/lessons/:id',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      title: Joi.string().min(1).max(255).optional(),
      duration: Joi.string().allow('', null).optional(),
      type: Joi.string().valid('video', 'text', 'quiz').optional(),
      content: Joi.string().allow('', null).optional(),
      order: Joi.number().integer().min(0).optional()
    })
  }),
  courseLessonController.updateLesson
);

// Xóa lesson
router.delete(
  '/lessons/:id',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  courseLessonController.deleteLesson
);

module.exports = router;







