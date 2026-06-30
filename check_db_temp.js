const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  console.log('DB Host:', process.env.DB_HOST);
  console.log('DB Name:', process.env.DB_NAME);
  
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || '3hstation'
    });
    
    console.log('Connected to MySQL successfully!');
    
    // Check facebook_pages
    const [pages] = await connection.query('SELECT id, page_id, page_name, dify_api_key, dify_api_url, ai_enabled, sales_engine_enabled FROM facebook_pages');
    console.log('\n--- Facebook Pages ---');
    console.log(pages);
    
    // Check the latest leads
    const [leads] = await connection.query('SELECT id, page_id, facebook_user_id, dify_conversation_id, lead_status, ai_enabled, phone, course_interest FROM facebook_leads ORDER BY updated_at DESC LIMIT 5');
    console.log('\n--- Latest Facebook Leads ---');
    console.log(leads);
    
  } catch (err) {
    console.error('Error connecting or querying DB:', err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
