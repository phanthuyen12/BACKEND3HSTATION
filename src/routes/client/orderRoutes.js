const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const orderController = require('../../controllers/client/orderController');

const router = express.Router();

router.post(
  '/',
  authenticate,
  validate({
    body: Joi.object({
      userId: Joi.string().required(),
      type: Joi.string().valid('course', 'workflow', 'vps').required(),
      itemId: Joi.string().required(),
      paymentMethod: Joi.string().valid('balance', 'bank', 'card').required()
    })
  }),
  orderController.createOrder
);
router.get(
  '/:id',
  authenticate,
  validate({
    params: Joi.object({ id: Joi.string().required() })
  }),
  orderController.getOrderById
);
router.post(
  '/:id/pay',
  authenticate,
  validate({
    params: Joi.object({ id: Joi.string().required() }),
    body: Joi.object({
      paymentMethod: Joi.string().valid('balance', 'bank', 'card').required()
    })
  }),
  orderController.payOrder
);

module.exports = router;













