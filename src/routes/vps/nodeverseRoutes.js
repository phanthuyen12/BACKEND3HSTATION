const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const nodeverseController = require('../../controllers/vps/nodeverseController');

const router = express.Router();

/**
 * GET /api/vps/nodeverse/devices
 * Lấy danh sách tất cả VPS devices từ Nodeverse third-party API
 */
router.get(
    '/devices',
    authenticate,
    authorizeRoles('admin'),
    nodeverseController.getDevices
);

/**
 * GET /api/vps/nodeverse/stats
 * Lấy thống kê VPS devices từ Nodeverse
 */
router.get(
    '/stats',
    authenticate,
    authorizeRoles('admin'),
    nodeverseController.getDevicesStats
);

/**
 * GET /api/vps/nodeverse/devices/:id
 * Lấy chi tiết 1 VPS device từ Nodeverse theo ID
 */
router.get(
    '/devices/:id',
    authenticate,
    authorizeRoles('admin'),
    validate({
        params: Joi.object({
            id: Joi.string().required()
        })
    }),
    nodeverseController.getDeviceById
);

/**
 * GET /api/vps/nodeverse/agencies/revenue
 * Lấy doanh thu tổng hợp của tất cả Agency
 */
router.get(
    '/agencies/revenue',
    authenticate,
    authorizeRoles('admin'),
    nodeverseController.getAllAgenciesRevenue
);

/**
 * GET /api/vps/nodeverse/agency/:agencyId/revenue
 * Lấy doanh thu và danh sách đơn theo AgencyId
 */
router.get(
    '/agency/:agencyId/revenue',
    authenticate,
    authorizeRoles('admin'),
    validate({
        params: Joi.object({
            agencyId: Joi.string().required()
        })
    }),
    nodeverseController.getAgencyRevenue
);

module.exports = router;
