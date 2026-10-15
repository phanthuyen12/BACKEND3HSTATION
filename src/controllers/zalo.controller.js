const zaloEngine = require('../services/zaloEngine.service');

exports.getQRCode = async (req, res) => {
    try {
        const result = await zaloEngine.startQRLogin();
        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi sinh mã QR Zalo: ' + error.message
        });
    }
};

exports.getStatus = (req, res) => {
    const status = zaloEngine.getStatus();
    return res.json({
        success: true,
        data: status
    });
};

exports.sendMessage = async (req, res) => {
    try {
        const { threadId, message, isGroup } = req.body;
        if (!threadId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tham số threadId hoặc message'
            });
        }
        const result = await zaloEngine.sendMessage(threadId, message, !!isGroup);
        return res.json(result);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi gửi tin nhắn Zalo: ' + error.message
        });
    }
};

exports.getFriends = async (req, res) => {
    try {
        const friends = await zaloEngine.getFriends();
        return res.json({
            success: true,
            data: friends
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách bạn bè: ' + error.message
        });
    }
};

exports.getGroups = async (req, res) => {
    try {
        const groups = await zaloEngine.getGroups();
        return res.json({
            success: true,
            data: groups
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách nhóm: ' + error.message
        });
    }
};

exports.logout = (req, res) => {
    const result = zaloEngine.logout();
    return res.json(result);
};
