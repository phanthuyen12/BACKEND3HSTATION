const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const planController = require('../../controllers/vps/planController');

const router = express.Router();

// GET /api/vps/plans - Lấy danh sách tất cả gói VPS
router.get(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    query: Joi.object({
      search: Joi.string().allow('').optional(),
      popular: Joi.boolean().optional()
    })
  }),
  planController.listPlans
);

// POST /api/vps/plans - Tạo gói VPS mới
router.post(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    body: Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      price: Joi.string().required(),
      unit: Joi.string().required(),
      cpu: Joi.string().required(),
      ram: Joi.string().required(),
      ssd: Joi.string().required(),
      bandwidth: Joi.string().required(),
      discountLabel: Joi.string().allow('', null).optional(),
      popular: Joi.boolean().optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  planController.createPlan
);

// PUT /api/vps/plans/:id - Cập nhật thông tin gói VPS
router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().optional(),
      price: Joi.string().optional(),
      unit: Joi.string().optional(),
      cpu: Joi.string().optional(),
      ram: Joi.string().optional(),
      ssd: Joi.string().optional(),
      bandwidth: Joi.string().optional(),
      discountLabel: Joi.string().allow('', null).optional(),
      popular: Joi.boolean().optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  planController.updatePlan
);

// DELETE /api/vps/plans/:id - Xóa gói VPS
router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  planController.deletePlan
);

// PATCH /api/vps/plans/:id/toggle-popular - Bật/tắt đánh dấu gói phổ biến
router.patch(
  '/:id/toggle-popular',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      popular: Joi.boolean().required()
    })
  }),
  planController.togglePopular
);

// GET /api/vps/plans/stats - Lấy thống kê gói VPS
router.get(
  '/stats',
  authenticate,
  authorizeRoles('admin'),
  planController.getStats
);

module.exports = router;













