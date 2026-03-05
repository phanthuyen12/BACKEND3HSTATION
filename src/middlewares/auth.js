const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const userService = require('../services/userService');

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authorization header missing');
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await userService.getUserById(decoded.userId);

  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      const decoded = verifyToken(token);
      const user = await userService.getUserById(decoded.userId);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // ignore invalid token for optional auth
    }
  }
  next();
});

const authorizeRoles = (...roles) =>
  (req, _res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    next();
  };

module.exports = {
  authenticate,
  optionalAuth,
  authorizeRoles
};

