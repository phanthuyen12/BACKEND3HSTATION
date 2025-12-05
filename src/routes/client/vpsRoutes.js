const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const vpsController = require('../../controllers/client/vpsController');

const router = express.Router();

// GET /api/client/vps/plans - Lấy danh sách gói VPS cho client
router.get(
  '/plans',
  vpsController.listPlans
);

// POST /api/client/vps/orders - Tạo đơn hàng mua gói VPS
router.post(
  '/orders',
  authenticate,
  validate({
    body: Joi.object({
      planId: Joi.string().required(),
      paymentMethod: Joi.string().valid('balance', 'bank', 'card').optional()
    })
  }),
  vpsController.createOrder
);

module.exports = router;













