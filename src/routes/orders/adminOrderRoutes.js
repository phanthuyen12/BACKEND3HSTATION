const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const adminOrderController = require('../../controllers/orders/adminOrderController');

const router = express.Router();

// GET /api/orders/admin/vps - Lấy danh sách đơn hàng VPS (admin)
router.get(
  '/vps',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      status: Joi.string().optional(),
      search: Joi.string().allow('').optional()
    })
  }),
  adminOrderController.getVpsOrders
);

// GET /api/orders/admin/workflows - Lấy danh sách đơn hàng workflows (admin)
router.get(
  '/workflows',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      status: Joi.string().optional(),
      search: Joi.string().allow('').optional()
    })
  }),
  adminOrderController.getWorkflowOrders
);

// GET /api/orders/admin/:id - Lấy chi tiết đơn hàng (admin)
router.get(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  adminOrderController.getOrderById
);

// PATCH /api/orders/admin/:id/status - Cập nhật trạng thái đơn hàng (admin)
router.patch(
  '/:id/status',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      status: Joi.string().valid('pending', 'paid', 'processing', 'completed', 'cancelled', 'dang-cho-xu-ly', 'dang-tao', 'tao-thanh-cong').required()
    })
  }),
  adminOrderController.updateOrderStatus
);

// PATCH /api/orders/admin/:id/notes - Cập nhật ghi chú/description đơn hàng (admin)
router.patch(
  '/:id/notes',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      notes: Joi.string().allow('').optional(),
      description: Joi.string().allow('').optional()
    })
  }),
  adminOrderController.updateOrderNotes
);

// POST /api/orders/admin/:id/attachment - Thêm file/link đính kèm cho đơn hàng (admin)
router.post(
  '/:id/attachment',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      attachmentUrl: Joi.string().uri().optional(),
      attachmentName: Joi.string().optional(),
      attachmentType: Joi.string().valid('link', 'file').optional()
    })
  }),
  adminOrderController.addOrderAttachment
);

module.exports = router;



