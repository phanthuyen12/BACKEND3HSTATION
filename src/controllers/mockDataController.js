const nodeverseModel = require("../models/vps/nodeverseModel");
const orderModel = require("../models/orders/orderModel");
const userModel = require("../models/userModel");
const vpsPlanModel = require("../models/vps/planModel");
const { query } = require("../config/database");
const ApiError = require("../utils/apiError");

/**
 * API Create Mock Data for Nodeverse Orders
 */
const createMockNodeverseData = async (req, res, next) => {
    try {
        let { items, rawText, driverId } = req.body;

        // Nếu truyền driverId trực tiếp (tạo lẻ nhanh)
        if (driverId && !items && !rawText) {
            items = [{ deviceId: driverId }];
        }

        if (rawText && !items) {
            items = rawText.split('\n')
                .filter(line => line.trim() !== '')
                .map(line => {
                    const lineTrimmed = line.trim();
                    const lastTab = lineTrimmed.lastIndexOf('\t');
                    const lastSpace = lineTrimmed.lastIndexOf(' ');
                    const splitIndex = lastTab > lastSpace ? lastTab : lastSpace;

                    if (splitIndex === -1) {
                        return {
                            deviceId: lineTrimmed,
                            userStr: null
                        };
                    }

                    return {
                        userStr: lineTrimmed.substring(0, splitIndex).trim(),
                        deviceId: lineTrimmed.substring(splitIndex + 1).trim(),
                    };
                })
                .filter(i => i !== null);
        }

        if (!items || !Array.isArray(items)) {
            throw ApiError.badRequest("Cần cung cấp mảng 'items', 'rawText', hoặc 'driverId'");
        }

        const results = [];

        for (const item of items) {
            const { userStr, deviceId } = item;
            const finalDeviceId = deviceId || driverId;
            if (!finalDeviceId) continue;

            try {
                let user = null;

                // 1. CHỌN NGƯỜI DÙNG: Theo userStr hoặc ngẫu nhiên
                if (userStr) {
                    let email = "";
                    let legacyId = "N/A";
                    if (userStr.includes('+')) {
                        const parts = userStr.split('+');
                        legacyId = parts[0].trim();
                        email = parts[1].trim();
                    } else {
                        email = userStr.trim();
                    }
                    user = await userModel.getUserByEmail(email);
                    if (!user) {
                        user = await userModel.createUser({
                            name: legacyId !== "N/A" ? legacyId : "Mock User",
                            email: email,
                            passwordHash: "$2b$10$EixZA5VK1pALM92f440Cgu07mB9hS.. MockPassword ..",
                            role: "user",
                            status: "active"
                        });
                    }
                } else {
                    // Lấy user ngẫu nhiên từ hệ thống
                    const randomUsers = await query("SELECT * FROM users WHERE role = 'user' AND status = 'active' ORDER BY RAND() LIMIT 1");
                    if (randomUsers && randomUsers.length > 0) {
                        user = randomUsers[0];
                    } else {
                        // Fallback nếu không có user nào
                        user = await userModel.getUserByEmail("mock.user@example.com");
                        if (!user) {
                            user = await userModel.createUser({
                                name: "Mock User Default",
                                email: "mock.user@example.com",
                                passwordHash: "$2b$10$..",
                                role: "user",
                                status: "active"
                            });
                        }
                    }
                }

                // 2. CHỌN CẤU HÌNH STANDARD VPS NGẪU NHIÊN
                let plan = null;
                const allVpsPlans = await vpsPlanModel.listPlans({ status: 'active' });
                if (allVpsPlans && allVpsPlans.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allVpsPlans.length);
                    plan = allVpsPlans[randomIndex];
                }

                if (!plan) {
                    // Fallback plan if no vps_plans in DB
                    plan = {
                        id: "standard_vps_mock",
                        name: "Standard VPS Mẫu",
                        price: 150000,
                        cpu: "2 vCPU",
                        ram: "4GB",
                        ssd: "50GB",
                        operating_system: "Ubuntu 22.04"
                    };
                }

                const userId = user.id;
                const planPrice = parseFloat(plan.price) || 0;
                const toMySql = (d) => d.toISOString().slice(0, 19).replace("T", " ");

                // 3. TẠO ĐƠN HÀNG MỚI ( PURCHASE )
                const purchaseOrder = await orderModel.createOrder({
                    userId,
                    type: "nodeverse_vps",
                    itemId: String(plan.id),
                    amount: planPrice,
                    paymentMethod: "balance",
                    status: "completed",
                });

                const now = new Date();
                const expiry = new Date(now);
                expiry.setMonth(expiry.getMonth() + 1);

                // 4. TẠO INSTANCE (VPS) TRONG HỆ THỐNG
                const instance = await nodeverseModel.createInstance({
                    userId,
                    orderId: purchaseOrder.id,
                    planId: String(plan.id),
                    nodeverseDeviceId: finalDeviceId,
                    status: "active",
                    expiresAt: toMySql(expiry),
                    billingTermCode: "1m",
                    billingMonths: 1,
                    billingDiscountPercent: 0,
                    billingAmount: planPrice,
                    deviceName: plan.name,
                    deviceIp: "125.12.34." + (Math.floor(Math.random() * 254) + 1),
                    deviceHostname: "mock-vps-" + finalDeviceId.substring(0, 8),
                    configuration: {
                        is_mock: true,
                        is_hybrid: true, // Mặc định là hybrid theo yêu cầu người dùng
                        cpu: plan.cpu,
                        ram: plan.ram,
                        ssd: plan.ssd,
                        os_version: plan.operating_system || "Ubuntu 22.04"
                    }
                });

                // 5. TẠO THÊM ĐƠN HÀNG RENEWAL (Gia hạn 1 tháng nữa cho giống thật)
                const renewalOrder = await orderModel.createOrder({
                    userId,
                    type: "nodeverse_vps",
                    itemId: String(instance.id),
                    amount: planPrice,
                    paymentMethod: "balance",
                    status: "completed",
                });

                const finalExpiry = new Date(expiry);
                finalExpiry.setMonth(finalExpiry.getMonth() + 1);

                await nodeverseModel.updateInstance(instance.id, {
                    expiresAt: toMySql(finalExpiry),
                    billingAmount: planPrice
                });

                results.push({
                    deviceId: finalDeviceId,
                    status: "success",
                    userName: user.name,
                    userEmail: user.email,
                    planName: plan.name,
                    instanceId: instance.id,
                    purchaseOrderId: purchaseOrder.id,
                    finalExpiry: toMySql(finalExpiry)
                });

            } catch (err) {
                results.push({ deviceId: finalDeviceId, error: err.message });
            }
        }

        res.json({
            success: true,
            totalProcessed: items.length,
            results
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    createMockNodeverseData
};
