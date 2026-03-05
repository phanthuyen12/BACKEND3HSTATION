const { execute } = require('./src/config/database');

async function run() {
    try {
        await execute('ALTER TABLE nodeverse_vps_plans ADD COLUMN bandwidth INT DEFAULT NULL;');
        console.log('Added bandwidth');
    } catch(e) { console.log(e.message); }
    
    try {
        await execute('ALTER TABLE nodeverse_vps_plans ADD COLUMN notes TEXT DEFAULT NULL;');
        console.log('Added notes');
    } catch(e) { console.log(e.message); }

    process.exit(0);
}

run();
