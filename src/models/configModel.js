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
            `
              INSERT INTO system_configs (config_key, config_value)
              VALUES (?, ?)
              ON DUPLICATE KEY UPDATE
                config_value = VALUES(config_value),
                updated_at = CURRENT_TIMESTAMP
            `,
            [key, value]
        );
    });
    await Promise.all(promises);
    return getAllConfigs();
};

module.exports = {
    getAllConfigs,
    updateConfigs
};
