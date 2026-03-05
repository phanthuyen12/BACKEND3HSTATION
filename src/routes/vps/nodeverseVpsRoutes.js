const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ctrl = require('../../controllers/vps/nodeverseVpsController');

const router = express.Router();

// POST /api/vps/nodeverse-plans/sync — Sync từ Nodeverse API vào DB
router.post('/sync', authenticate, ctrl.syncPlans);

// GET /api/vps/nodeverse-plans/instances — Danh sách đơn hàng (admin)
router.get(
    '/instances',
    authenticate,

    validate({
        query: Joi.object({
            userId: Joi.string().optional(),
            status: Joi.string().valid('pending', 'active', 'suspended', 'expired', 'cancelled').optional(),
            limit: Joi.number().integer().min(1).max(100).optional(),
            offset: Joi.number().integer().min(0).optional()
        })
    }),
    ctrl.adminListInstances
);

// GET /api/vps/nodeverse-plans/stats — Tổng doanh thu & đơn hàng
router.get('/stats', authenticate, authorizeRoles('admin'), ctrl.adminGetGeneralStats);

// GET /api/vps/nodeverse-plans/stats/:deviceId — Thống kê & đơn hàng theo thiết bị
router.get(
    '/stats/:deviceId',
    authenticate,
    authorizeRoles('admin'),
    validate({ params: Joi.object({ deviceId: Joi.string().required() }) }),
    ctrl.adminGetStatsByDeviceId
);

// GET /api/vps/nodeverse-plans — Danh sách plans (admin)
router.get('/', authenticate, ctrl.adminListPlans);

// PUT /api/vps/nodeverse-plans/:id — Cập nhật giá + trạng thái
router.put(
    '/:id',
    authenticate,

    validate({
        params: Joi.object({ id: Joi.string().required() }),
        body: Joi.object({
            price: Joi.number().min(0).optional(),
            unit: Joi.string().optional(),
            discountLabel: Joi.string().allow('', null).optional(),
            popular: Joi.boolean().optional(),
            isActive: Joi.boolean().optional(),
            tag: Joi.string().allow('', null).optional()
        })
    }),
    ctrl.adminUpdatePlan
);

module.exports = router;
