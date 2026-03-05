const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const nodeverseController = require('../../controllers/vps/nodeverseController');

const router = express.Router();

/**
 * GET /api/client/vps/nodeverse/devices
 * Client: Lấy danh sách VPS devices từ Nodeverse (chỉ cần đăng nhập)
 */
router.get(
    '/devices',
    authenticate,
    nodeverseController.getDevices
);

/**
 * GET /api/client/vps/nodeverse/stats
 * Client: Lấy thống kê VPS devices từ Nodeverse
 */
router.get(
    '/stats',
    authenticate,
    nodeverseController.getDevicesStats
);

/**
 * GET /api/client/vps/nodeverse/devices/:id
 * Client: Lấy chi tiết 1 VPS device từ Nodeverse theo ID
 */
router.get(
    '/devices/:id',
    authenticate,
    validate({
        params: Joi.object({
            id: Joi.string().required()
        })
    }),
    nodeverseController.getDeviceById
);

module.exports = router;
