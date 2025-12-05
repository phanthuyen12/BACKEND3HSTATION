const express = require('express');
const Joi = require('joi');
const {
  authenticate,
  authorizeRoles,
  optionalAuth
} = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const courseController = require('../controllers/courseController');
const videoController = require('../controllers/videoController');

const router = express.Router();

router.get(
  '/',
  validate({
    query: Joi.object({
      category_id: Joi.number().integer().positive().optional(),
      free: Joi.number().valid(0, 1).optional(),
      search: Joi.string().allow('').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  }),
  courseController.listCourses
);

router.get(
  '/:id',
  // optionalAuth,
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  courseController.getCourseDetail
);

const courseBodySchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().allow('', null).required(),
    category_id: Joi.number().integer().positive().required(),
    is_free: Joi.boolean().required(),
    price: Joi.number().precision(2).min(0).required(),
    thumbnail_url: Joi.string().uri().allow('', null).optional()
  })
};

router.post(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate(courseBodySchema),
  courseController.createCourse
);

router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      title: Joi.string().min(3).max(255).optional(),
      description: Joi.string().allow('', null).optional(),
      category_id: Joi.number().integer().positive().optional(),
      is_free: Joi.boolean().optional(),
      price: Joi.number().precision(2).min(0).optional(),
      thumbnail_url: Joi.string().uri().allow('', null).optional()
    })
  }),
  courseController.updateCourse
);

router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  courseController.deleteCourse
);

router.get(
  '/:course_id/videos',
  // optionalAuth,
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required()
    }),
    query: Joi.object({
      section_id: Joi.number().integer().positive().optional()
    })
  }),
  videoController.listCourseVideos
);

router.post(
  '/:course_id/videos',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      course_id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      sectionId: Joi.number().integer().positive().required(),
      title: Joi.string().required(),
      url: Joi.string().required(),
      duration: Joi.number().integer().min(0).required(),
      order: Joi.number().integer().min(0).required(),
      preview: Joi.boolean().required()
    })
  }),
  videoController.createVideo
);

router.put(
  '/:course_id/videos/:id',
  authenticate,
  authorizeRoles('admin'),
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

