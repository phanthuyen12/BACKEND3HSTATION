const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const topupController = require('../../controllers/topups/topupController');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorizeRoles('admin'),
  validate({
    query: Joi.object({
      status: Joi.string().valid('cho-duyet', 'da-duyet', 'da-huy').optional(),
      topupStatus: Joi.string().valid('da-thanh-cong', 'chua-thanh-toan', 'het-han').optional(),
      search: Joi.string().allow('').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  }),
  topupController.listTopups
);
router.get(
  '/:code',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({ code: Joi.string().required() })
  }),
  topupController.getTopupByCode
);
router.patch(
  '/:code/approve',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({ code: Joi.string().required() }),
    body: Joi.object({
      note: Joi.string().optional()
    })
  }),
  topupController.approveTopup
);
router.patch(
  '/:code/reject',
  authenticate,
  authorizeRoles('admin'),
  validate({
    params: Joi.object({ code: Joi.string().required() }),
    body: Joi.object({
      reason: Joi.string().required()
    })
  }),
  topupController.rejectTopup
);
router.get('/stats', authenticate, authorizeRoles('admin'), topupController.getStats);

module.exports = router;













