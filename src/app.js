const express = require('express');
const morgan = require('morgan');
const apiRoutes = require('./routes');
const env = require('./config/env');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const cors = require('cors');

const app = express();

app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: 'http://localhost:5173', // frontend URL
  credentials: true, // nếu dùng cookie
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

app.use(notFound);
app.use(errorHandler);

module.exports = app;

















