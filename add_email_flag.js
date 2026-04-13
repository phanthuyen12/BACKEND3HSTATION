const { execute } = require('./src/config/database');

async function migrate() {
    try {
        console.log('Adding is_activation_email_sent to nodeverse_vps_instances...');
        await execute(`
            ALTER TABLE nodeverse_vps_instances 
            ADD COLUMN IF NOT EXISTS is_activation_email_sent TINYINT(1) DEFAULT 0
        `);
        
        console.log('Adding is_activation_email_sent to vps_instances...');
        await execute(`
            ALTER TABLE vps_instances 
            ADD COLUMN IF NOT EXISTS is_activation_email_sent TINYINT(1) DEFAULT 0
        `);
        
        console.log('Migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
