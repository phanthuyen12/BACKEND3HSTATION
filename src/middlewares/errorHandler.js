const ApiError = require('../utils/apiError');
const { errorResponse } = require('../utils/response');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  if (err instanceof ApiError) {
    return errorResponse(res, err.message, err.statusCode);
  }

  const statusCode = err.status || err.statusCode || 500;

  if (env.nodeEnv !== 'production') {
    // Include stack trace only in non-production environments
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal server error',
      stack: err.stack
    });
  }

  return errorResponse(res, 'Internal server error', statusCode);
};

module.exports = errorHandler;

















