const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const userController = require('../controllers/userController');

const router = express.Router();

// GET /api/users - Lấy danh sách users
router.get(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    query: Joi.object({
      search: Joi.string().allow('').optional(),
      status: Joi.string().valid('active', 'locked').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  }),
  userController.listUsers
);

// GET /api/users/stats
router.get('/stats', userController.getStats);

// GET /api/users/:id/detail-stats - thống kê đơn hàng + ref cho 1 user
router.get('/:id/detail-stats', userController.getUserDetailStats);

// GET /api/users/:id/orders - danh sách đơn hàng của user (có filter type + pagination)
router.get('/:id/orders', userController.getUserOrders);

// GET /api/users/:id/refs - danh sách user được giới thiệu bởi user này
router.get('/:id/refs', userController.getUserRefs);

// GET /api/users/:id - Lấy chi tiết một user
router.get(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  userController.getUserById
);

// POST /api/users - Tạo user mới (admin)
router.post(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().optional(),
      password: Joi.string().min(6).required(),
      status: Joi.string().valid('active', 'locked').optional(),
      rankId: Joi.number().integer().positive().optional(),
      role: Joi.string().valid('user', 'admin', 'super_admin').optional()
    })
  }),
  userController.createUser
);

// PUT /api/users/:id - Cập nhật thông tin user
router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      status: Joi.string().valid('active', 'locked').optional(),
      balance: Joi.number().min(0).optional(),
      rankId: Joi.number().integer().positive().allow(null).optional()
    })
  }),
  userController.updateUser
);

// PATCH /api/users/:id/toggle-lock - Khóa/mở khóa tài khoản user
router.patch(
  '/:id/toggle-lock',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      status: Joi.string().valid('active', 'locked').required()
    })
  }),
  userController.toggleLock
);

// DELETE /api/users/:id - Xóa user
router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  userController.deleteUser
);

// PATCH /api/users/:id/balance - Cập nhật số dư user (admin thao tác)
router.patch(
  '/:id/balance',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      amount: Joi.number().required(),
      type: Joi.string().valid('add', 'subtract', 'set').required(),
      note: Joi.string().optional()
    })
  }),
  userController.updateBalance
);

// PATCH /api/users/:id/reset-password - Admin đặt lại mật khẩu (không cần mật khẩu cũ)
router.patch(
  '/:id/reset-password',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() }),
    body: Joi.object({ password: Joi.string().min(6).required() })
  }),
  userController.adminResetPassword
);

// PATCH /api/users/:id/rank - Gán rank cho user
router.patch(
  '/:id/rank',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() }),
    body: Joi.object({
      rankId: Joi.number().integer().positive().allow(null).required()
    })
  }),
  userController.updateUserRank
);


module.exports = router;



