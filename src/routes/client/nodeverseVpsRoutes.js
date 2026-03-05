const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ctrl = require('../../controllers/vps/nodeverseVpsController');

const router = express.Router();

// GET /api/client/vps/nodeverse-plans/my-orders — Đơn hàng của tôi (đặt trước /:id)
router.get('/my-orders', authenticate, ctrl.getMyOrders);

// GET /api/client/vps/nodeverse-plans/my-orders/:id — Chi tiết đơn hàng
router.get('/my-orders/:id', authenticate, ctrl.getMyOrderById);

// POST /api/client/vps/nodeverse-plans/my-orders/:id/:action — Điều khiển
router.post('/my-orders/:id/:action', authenticate, ctrl.manageContainerState);

// POST /api/client/vps/nodeverse-plans/order — Đặt hàng
router.post(
    '/order',
    authenticate,
    // validate({

    //     body: Joi.object({
    //         planId: Joi.required(),
    //         paymentMethod: Joi.string().default('balance').optional(),
    //         billingTermCode: Joi.string().valid('1m', '3m', '6m', '12m', '24m', '36m', '60m', '120m').default('1m'),
    //         autoRenew: Joi.boolean().default(false).optional()
    //     })
    // }),
    ctrl.createOrder
);

// GET /api/client/vps/nodeverse-plans/:id/pricing — Bảng giá theo chu kỳ
router.get(
    '/:id/pricing',
    authenticate,
    validate({ params: Joi.object({ id: Joi.string().required() }) }),
    ctrl.getPlanPricing
);

// GET /api/client/vps/nodeverse-plans — Danh sách plans mở bán
router.get('/', authenticate, ctrl.clientListPlans);

module.exports = router;
