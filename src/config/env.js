const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'labtest',
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10)
  },
  nodeverse: {
    apiUrl: process.env.NODEVERSE_API_URL || 'https://vps-api.nodeverse.ai/api',
    apiKey: process.env.NODEVERSE_API_KEY || ''
  }
};

module.exports = env;

















