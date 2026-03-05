const { query, execute } = require('../config/database');

const getAllConfigs = async () => {
    const rows = await query('SELECT * FROM system_configs');
    const configs = {};
    rows.forEach(row => {
        configs[row.config_key] = row.config_value;
    });
    return configs;
};

const updateConfigs = async (configs) => {
    const promises = Object.entries(configs).map(([key, value]) => {
        return execute(
            'UPDATE system_configs SET config_value = ? WHERE config_key = ?',
            [value, key]
        );
    });
    await Promise.all(promises);
    return getAllConfigs();
};

module.exports = {
    getAllConfigs,
    updateConfigs
};
