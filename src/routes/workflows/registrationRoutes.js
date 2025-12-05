const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const registrationController = require('../../controllers/workflows/registrationController');

const router = express.Router();

router.get(
  '/',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    query: Joi.object({
      workflowId: Joi.string().optional(),
      status: Joi.string().valid('cho-duyet', 'da-duyet', 'da-huy').optional(),
      search: Joi.string().allow('').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  }),
  registrationController.listRegistrations
);
router.patch(
  '/:id/approve',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() })
  }),
  registrationController.approveRegistration
);
router.patch(
  '/:id/reject',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() }),
    body: Joi.object({
      reason: Joi.string().optional()
    })
  }),
  registrationController.rejectRegistration
);
router.delete(
  '/:id',
  // authenticate,
  // authorizeRoles('admin'),
  validate({
    params: Joi.object({ id: Joi.string().required() })
  }),
  registrationController.deleteRegistration
);
router.get('/stats', authenticate, authorizeRoles('admin'), registrationController.getStats);

module.exports = router;













