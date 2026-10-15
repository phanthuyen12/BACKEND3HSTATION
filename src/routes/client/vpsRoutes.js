const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const vpsController = require('../../controllers/client/vpsController');

const router = express.Router();

// GET /api/client/vps/plans - Lấy danh sách gói VPS cho client
router.get('/plans', vpsController.listPlans);

// GET /api/client/vps/plans/:id/pricing - Lấy bảng giá theo chu kỳ cho 1 gói VPS
router.get(
  '/plans/:id/pricing',
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  vpsController.getPlanPricing
);

// POST /api/client/vps/orders - Tạo đơn hàng mua gói VPS
router.post(
  '/orders',
  authenticate,
  validate({
    body: Joi.object({
      planId: Joi.string().required(),
      paymentMethod: Joi.string().valid('balance', 'bank', 'card').optional(),
      billingTermCode: Joi.string()
        .valid('1m', '3m', '6m', '12m', '24m', '36m', '60m', '120m')
        .optional(),
      autoRenew: Joi.boolean().optional()
    })
  }),
  vpsController.createOrder
);

module.exports = router;













