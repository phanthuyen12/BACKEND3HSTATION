const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const instanceController = require('../../controllers/vps/instanceController');

const router = express.Router();

// GET /api/vps/instances - Lấy danh sách VPS instances
router.get(
  '/',
  authenticate,
  authorizeRoles('admin'),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      userId: Joi.string().optional(),
      status: Joi.string().valid('pending', 'active', 'suspended', 'expired', 'cancelled').optional(),
      search: Joi.string().allow('').optional()
    })
  }),
  instanceController.listInstances
);

// GET /api/vps/instances/:id - Lấy chi tiết VPS instance
router.get(
  '/:id',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  instanceController.getInstanceById
);

// PUT /api/vps/instances/:id - Cập nhật VPS instance
router.put(
  '/:id',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      status: Joi.string().valid('pending', 'active', 'suspended', 'expired', 'cancelled').optional(),
      ipAddress: Joi.string().ip().optional().allow(''),
      hostname: Joi.string().optional().allow(''),
      // expiresAt: Joi.string().isoDate().optional().allow(''),
      configuration: Joi.object().optional(),
      notes: Joi.string().optional().allow('')
    })
  }),
  instanceController.updateInstance
);

// DELETE /api/vps/instances/:id - Xóa VPS instance
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  instanceController.deleteInstance
);

module.exports = router;

