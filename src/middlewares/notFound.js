const ApiError = require('../utils/apiError');

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

module.exports = notFound;

















