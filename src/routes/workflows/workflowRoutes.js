const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const workflowController = require('../../controllers/workflows/workflowController');
const workflowLinkController = require('../../controllers/workflows/workflowLinkController');
const adminOrderController = require('../../controllers/orders/adminOrderController');

const router = express.Router();

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
  workflowController.listWorkflows
);

// GET /api/workflows/orders - Alias cho /api/orders/admin/workflows
// Phải đặt TRƯỚC route /:id để tránh conflict
router.get(
  '/orders',
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

router.get(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() })
  }),
  workflowController.getWorkflowById
);
router.post(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    body: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      categoryId: Joi.string().required(),
      image: Joi.string().allow('', null).optional(),
      price: Joi.string().required(),
      tags: Joi.array().items(Joi.string()).optional(),
      content: Joi.string().allow('', null).optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  workflowController.createWorkflow
);
router.put(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() }),
    body: Joi.object({
      name: Joi.string().optional(),
      description: Joi.string().optional(),
      categoryId: Joi.string().optional(),
      image: Joi.string().allow('', null).optional(),
      price: Joi.string().optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      content: Joi.string().allow('', null).optional(),
      status: Joi.string().valid('active', 'inactive').optional()
    })
  }),
  workflowController.updateWorkflow
);
router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() })
  }),
  workflowController.deleteWorkflow
);
router.get('/stats', authenticate, authorizeRoles('admin'), workflowController.getStats);

// Workflow Links Routes
// GET /api/workflows/:workflowId/links - Lấy danh sách links
router.get(
  '/:workflowId/links',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ workflowId: Joi.string().required() }),
    query: Joi.object({
      status: Joi.string().valid('chua-ban', 'da-ban').optional()
    })
  }),
  workflowLinkController.getWorkflowLinks
);

// POST /api/workflows/:workflowId/links/bulk - Thêm links hàng loạt
router.post(
  '/:workflowId/links/bulk',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ workflowId: Joi.string().required() }),
    body: Joi.object({
      links: Joi.array().items(Joi.string().uri().allow('')).required().min(1)
    })
  }),
  workflowLinkController.addWorkflowLinksBulk
);

// POST /api/workflows/:workflowId/links - Thêm 1 link
router.post(
  '/:workflowId/links',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ workflowId: Joi.string().required() }),
    body: Joi.object({
      downloadLink: Joi.string().uri().required()
    })
  }),
  workflowLinkController.addWorkflowLink
);

// PUT /api/workflows/links/:linkId - Cập nhật link
router.put(
  '/links/:linkId',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ linkId: Joi.string().required() }),
    body: Joi.object({
      downloadLink: Joi.string().uri().optional(),
      status: Joi.string().valid('chua-ban', 'da-ban').optional()
    })
  }),
  workflowLinkController.updateWorkflowLink
);

// DELETE /api/workflows/links/:linkId - Xóa link
router.delete(
  '/links/:linkId',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ linkId: Joi.string().required() })
  }),
  workflowLinkController.deleteWorkflowLink
);

module.exports = router;













