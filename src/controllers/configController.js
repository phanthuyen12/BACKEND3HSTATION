const configModel = require('../models/configModel');

const getConfigs = async (req, res, next) => {
    try {
        const configs = await configModel.getAllConfigs();
        res.json({
            success: true,
            data: configs
        });
    } catch (err) {
        next(err);
    }
};

const updateConfigs = async (req, res, next) => {
    try {
        // req.body contains key-value pairs
        const updated = await configModel.updateConfigs(req.body);
        res.json({
            success: true,
            message: 'Cập nhật cấu hình thành công',
            data: updated
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getConfigs,
    updateConfigs
};
