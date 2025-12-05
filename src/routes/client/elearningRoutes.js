const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const elearningController = require('../../controllers/client/elearningController');

const router = express.Router();

// GET /api/client/elearning/courses - Lấy danh sách khoá học cho client
router.get(
  '/courses',
  validate({
    query: Joi.object({
      category: Joi.string().optional(),
      search: Joi.string().allow('').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  }),
  elearningController.listCourses
);

// GET /api/client/elearning/courses/:id - Lấy chi tiết khoá học cho client
router.get(
  '/courses/:id',
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  elearningController.getCourseById
);

// GET /api/client/elearning/courses/:id/enrollment - Check enrollment status
// Using optionalAuth to allow checking without login, but will return false if not logged in
router.get(
  '/courses/:id/enrollment',
  require('../../middlewares/auth').optionalAuth,
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  elearningController.checkEnrollment
);

// POST /api/client/elearning/courses/:id/enroll - Đăng ký khóa học
router.post(
  '/courses/:id/enroll',
  authenticate,
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  elearningController.enrollCourse
);

// GET /api/client/elearning/categories - Lấy danh sách danh mục khoá học
router.get(
  '/categories',
  elearningController.listCategories
);

module.exports = router;













