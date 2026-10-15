const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const nodeverseService = require('../../services/vps/nodeverseService');

/**
 * GET /api/vps/nodeverse/devices
 * Lấy danh sách tất cả VPS devices từ Nodeverse API
 */
const getDevices = asyncHandler(async (req, res) => {
    const data = await nodeverseService.getDevices();
    return successResponse(res, data, 'Lấy danh sách VPS devices từ Nodeverse thành công');
});

/**
 * GET /api/vps/nodeverse/devices/:id
 * Lấy chi tiết 1 VPS device từ Nodeverse API
 */
const getDeviceById = asyncHandler(async (req, res) => {
    const data = await nodeverseService.getDeviceById(req.params.id);
    return successResponse(res, data, 'Lấy chi tiết VPS device từ Nodeverse thành công');
});

/**
 * GET /api/vps/nodeverse/stats
 * Lấy thống kê tổng quan VPS devices từ Nodeverse
 */
const getDevicesStats = asyncHandler(async (req, res) => {
    const data = await nodeverseService.getDevicesStats();
    return successResponse(res, data, 'Lấy thống kê VPS devices từ Nodeverse thành công');
});

/**
 * GET /api/vps/nodeverse/agencies/revenue
 * Lấy doanh thu tổng hợp của tất cả Agency
 */
const getAllAgenciesRevenue = asyncHandler(async (req, res) => {
    const nodeverseModel = require('../../models/vps/nodeverseModel');
    const data = await nodeverseModel.getTotalRevenueByAgencies();
    return successResponse(res, data, 'Lấy tổng doanh thu của các Agency thành công');
});

/**
 * GET /api/vps/nodeverse/agency/:agencyId/revenue
 * Lấy doanh thu & danh sách orders theo agencyId
 */
const getAgencyRevenue = asyncHandler(async (req, res) => {
    const { agencyId } = req.params;
    const nodeverseModel = require('../../models/vps/nodeverseModel');
    const data = await nodeverseModel.getRevenueAndOrdersByAgency(agencyId);
    return successResponse(res, data, 'Lấy doanh thu VPS theo Agency ID thành công');
});

module.exports = {
    getDevices,
    getDeviceById,
    getDevicesStats,
    getAgencyRevenue,
    getAllAgenciesRevenue
};
