const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.post(
  '/',
  authenticate,
  validate({
    body: Joi.object({
      course_id: Joi.number().integer().positive().required(),
      price: Joi.number().precision(2).min(0).required(),
      method: Joi.string().min(2).max(50).required()
    })
  }),
  paymentController.createPayment
);

router.post(
  '/webhook',
  validate({
    body: Joi.object({
      payment_id: Joi.number().integer().positive().required(),
      status: Joi.string().valid('pending', 'success', 'failed').required(),
      metadata: Joi.any().optional()
    })
  }),
  paymentController.handleWebhook
);

router.get(
  '/:id',
  authenticate,
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required()
    })
  }),
  paymentController.getPayment
);

module.exports = router;

