const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const topupController = require('../../controllers/client/topupController');

const router = express.Router();

router.post(
  '/create',
  authenticate,
  validate({
    body: Joi.object({
      amount: Joi.number().min(0).required(),
      bankId: Joi.number().integer().positive().required()
    })
  }),
  topupController.createTopup
);
router.post(
  '/:code/upload-proof',
  authenticate,
  validate({
    params: Joi.object({ code: Joi.string().required() }),
    body: Joi.object({
      paymentProof: Joi.string().uri().required()
    })
  }),
  topupController.uploadProof
);
router.get(
  '/history',
  authenticate,
  validate({
    query: Joi.object({
      status: Joi.string().valid('chua-thanh-toan', 'het-han', 'da-thanh-cong').optional(),
      topup_status: Joi.string().valid('chua-thanh-toan', 'het-han', 'da-thanh-cong').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  }),
  topupController.getHistory
);
router.get('/banks', topupController.getBanks);

router.get(
  '/:code',
  authenticate,
  validate({
    params: Joi.object({ code: Joi.string().required() })
  }),
  topupController.getTopupByCode
);

module.exports = router;













