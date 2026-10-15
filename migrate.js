const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('./src/config/env');

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      multipleStatements: true
    });

    console.log('Connected to database');

    // Create migrations tracking table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_filename (filename)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Get list of migration files
    // Note:
    // - 001_create_base_tables_simple.sql is intended for manual usage only
    //   (see migrations/README.md) and can conflict with the automated, idempotent
    //   migrations. We therefore skip any "*_simple.sql" files here.
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => !file.includes('_simple')) // skip manual/simple migrations
      .sort();

    console.log(`Found ${files.length} migration files`);

    // Get already executed migrations
    const [executed] = await connection.query(
      'SELECT filename FROM migrations'
    );
    const executedFiles = new Set(executed.map(row => row.filename));

    // Execute each migration
    for (const file of files) {
      if (executedFiles.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`🔄 Running ${file}...`);

      try {
        await connection.query(sql);
        
        // Record migration
        await connection.query(
          'INSERT INTO migrations (filename) VALUES (?)',
          [file]
        );

        console.log(`✅ Successfully executed ${file}`);
      } catch (error) {
        console.error(`❌ Error executing ${file}:`, error.message);
        throw error;
      }
    }

    console.log('\n✨ All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run migrations
runMigrations();


