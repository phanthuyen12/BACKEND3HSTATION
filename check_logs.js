const { query } = require('./src/config/database');

async function main() {
  try {
    const rows = await query('SELECT * FROM facebook_chat_logs ORDER BY id DESC LIMIT 15');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

main();
