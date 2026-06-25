const express = require('express');
const Joi = require('joi');
const supportController = require('../controllers/supportController');
const validate = require('../middlewares/validate');
const { authenticate, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.get('/content', supportController.getSupportContent);

router.post(
  '/contact',
  validate({
    body: Joi.object({
      name: Joi.string().trim().min(2).max(100).required(),
      email: Joi.string().trim().email().required(),
      phone: Joi.string().trim().max(30).allow("").optional(),
      topic: Joi.string().trim().min(3).max(150).required(),
      message: Joi.string().trim().min(10).max(5000).required(),
      sourcePage: Joi.string().trim().max(100).optional(),
      refCode: Joi.string().trim().max(100).optional(),
      redirectUrl: Joi.string().trim().max(2000).optional()
    })
  }),
  supportController.createContactRequest
);

router.get(
  '/requests/stats',
  // authenticate,
  // authorizeRoles('admin'),
  supportController.getSupportRequestStats
);

router.get(
  '/requests',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      status: Joi.string().valid('new', 'reviewing', 'resolved').optional(),
      sourcePage: Joi.string().allow('').optional(),
      search: Joi.string().allow('').optional()
    })
  }),
  supportController.listSupportRequests
);

router.get(
  '/requests/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  supportController.getSupportRequestById
);

router.patch(
  '/requests/:id/status',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      status: Joi.string().valid('new', 'reviewing', 'resolved').required()
    })
  }),
  supportController.updateSupportRequestStatus
);

module.exports = router;
