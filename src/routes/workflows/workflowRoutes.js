const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const workflowController = require('../../controllers/workflows/workflowController');
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

module.exports = router;













