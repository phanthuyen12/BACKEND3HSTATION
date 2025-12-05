const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const categoryController = require('../../controllers/elearning/categoryController');

const router = express.Router();

const categoryBodySchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required()
  })
};

// GET /api/elearning/categories - Lấy danh sách tất cả danh mục khoá học
router.get('/', categoryController.listCategories);

// POST /api/elearning/categories - Tạo danh mục khoá học mới
router.post(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  // validate(categoryBodySchema),
  categoryController.createCategory
);

// PUT /api/elearning/categories/:id - Cập nhật thông tin danh mục khoá học
router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).required()
    })
  }),
  categoryController.updateCategory
);

// DELETE /api/elearning/categories/:id - Xóa danh mục khoá học
router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  categoryController.deleteCategory
);

// GET /api/elearning/categories/stats - Lấy thống kê về danh mục
router.get(
  '/stats',
  authenticate,
  authorizeRoles('admin'),
  categoryController.getStats
);

module.exports = router;













