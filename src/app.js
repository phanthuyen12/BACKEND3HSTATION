const express = require('express');
const path = require('path');

const morgan = require('morgan');
const apiRoutes = require('./routes');
const landingPageServingMiddleware = require('./middlewares/landingPageServingMiddleware');
const env = require('./config/env');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const cors = require('cors');

const app = express();

// Run migrations on start
const runMigrations = require('../migrate_auto');
runMigrations();

// Khởi tạo các tasks định kỳ
const { startNodeverseSyncTask } = require('./tasks/nodeverseSyncTask');
const { startFacebookSyncJob } = require('./tasks/facebookSyncJob');
const { startFacebookFollowUpTask } = require('./tasks/facebookFollowUpTask');
startNodeverseSyncTask();
startFacebookSyncJob();
// startFacebookFollowUpTask();

app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://api.aetrading.vn',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://api.aetrading.vn',
  'http://127.0.0.1:3000',
  'https://academy.aetrading.vn',
  'https://page.aetrading.vn',

  'https://aetrading.vn',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'OK',
    data: {
      service: 'LabTest API',
      env: env.nodeEnv,
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api', apiRoutes);

app.use(landingPageServingMiddleware);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
















