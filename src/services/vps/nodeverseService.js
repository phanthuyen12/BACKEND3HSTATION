const env = require('../../config/env');
const ApiError = require('../../utils/apiError');

/**
 * Base function to call Nodeverse API
 * @param {string} endpoint - API endpoint path (e.g. '/vps/devices')
 * @param {object} options - fetch options
 * @returns {Promise<any>}
 */
const callNodeverseApi = async (endpoint, options = {}) => {
    const { apiUrl, apiKey } = env.nodeverse;

    if (!apiKey) {
        throw ApiError.badRequest(
            'Nodeverse API key chưa được cấu hình. Vui lòng thêm NODEVERSE_API_KEY vào file .env'
        );
    }

    const url = `${apiUrl}${endpoint}`;

    const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
            'accept': '*/*',
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw ApiError.badRequest(
            `Nodeverse API lỗi (${response.status}): ${errorText}`
        );
    }

    const data = await response.json();
    return data;
};

/**
 * Lấy danh sách tất cả VPS devices từ Nodeverse
 */
const getDevices = async () => {
    const devices = await callNodeverseApi('/vps/devices');

    // Format dữ liệu trả về cho client
    const formattedDevices = (Array.isArray(devices) ? devices : []).map(device => ({
        id: device._id,
        agencyId: device.agencyId,
        name: device.name,
        ipAddress: device.ipAddress,
        hostname: device.hostname,
        status: device.status,
        operatingSystem: device.operatingSystem,
        cpuInfo: device.cpuInfo,
        totalMemory: device.totalMemory,
        diskSpace: device.diskSpace,
        isActive: device.isActive,
        tag: device.tag || null,
        socketId: device.socketId || null,
        lastConnectedAt: device.lastConnectedAt || null,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt
    }));

    return {
        total: formattedDevices.length,
        devices: formattedDevices
    };
};

/**
 * Lấy chi tiết 1 VPS device từ Nodeverse theo ID
 */
const getDeviceById = async (deviceId) => {
    const device = await callNodeverseApi(`/vps/devices/${deviceId}`);

    if (!device) {
        throw ApiError.notFound('Không tìm thấy VPS device trên Nodeverse');
    }

    return {
        id: device._id,
        agencyId: device.agencyId,
        name: device.name,
        ipAddress: device.ipAddress,
        hostname: device.hostname,
        status: device.status,
        operatingSystem: device.operatingSystem,
        cpuInfo: device.cpuInfo,
        totalMemory: device.totalMemory,
        diskSpace: device.diskSpace,
        isActive: device.isActive,
        tag: device.tag || null,
        socketId: device.socketId || null,
        lastConnectedAt: device.lastConnectedAt || null,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt
    };
};

/**
 * Lấy thống kê tổng quan về VPS devices
 */
const getDevicesStats = async () => {
    const devices = await callNodeverseApi('/vps/devices');
    const deviceList = Array.isArray(devices) ? devices : [];

    const online = deviceList.filter(d => d.status === 'online').length;
    const offline = deviceList.filter(d => d.status === 'offline').length;
    const totalMemory = deviceList.reduce((sum, d) => sum + (d.totalMemory || 0), 0);
    const totalDisk = deviceList.reduce((sum, d) => sum + (d.diskSpace || 0), 0);

    return {
        total: deviceList.length,
        online,
        offline,
        totalMemoryGB: totalMemory,
        totalDiskGB: totalDisk
    };
};

module.exports = {
    getDevices,
    getDeviceById,
    getDevicesStats
};
