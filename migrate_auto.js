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

    console.log('[AutoMigration] Connected to database');

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
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => !file.includes('_simple'))
      .sort();

    console.log(`[AutoMigration] Found ${files.length} migration files`);

    // Get already executed migrations
    const [executed] = await connection.query(
      'SELECT filename FROM migrations'
    );
    const executedFiles = new Set(executed.map(row => row.filename));

    // Execute each migration
    for (const file of files) {
      if (executedFiles.has(file)) {
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`[AutoMigration] Running ${file}...`);

      try {
        await connection.query(sql);
        
        // Record migration
        await connection.query(
          'INSERT INTO migrations (filename) VALUES (?)',
          [file]
        );

        console.log(`[AutoMigration] Successfully executed ${file}`);
      } catch (error) {
        console.error(`[AutoMigration] Error executing ${file}:`, error.message);
        // Do not throw to prevent server crash, just log it
      }
    }

    console.log('[AutoMigration] All migrations completed!');
  } catch (error) {
    console.error('[AutoMigration] Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('[AutoMigration] Database connection closed');
    }
  }
}

module.exports = runMigrations;
