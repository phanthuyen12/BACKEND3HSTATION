const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const userService = require('../services/userService');
const sessionService = require('../services/sessionService');
const { isPrivilegedRole } = require('../utils/roles');

const attachLegacyRankId = (user) => {
  if (!user) return user;

  if (user.rank_id !== undefined) {
    return user;
  }

  const rankId = user.rank?.id ? parseInt(user.rank.id, 10) : null;
  return {
    ...user,
    rank_id: Number.isNaN(rankId) ? null : rankId
  };
};

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

  if (!sessionService.isSessionActive(decoded.userId, decoded.sessionId)) {
    throw ApiError.unauthorized('Session expired because the account signed in on another device');
  }

  const user = attachLegacyRankId(await userService.getUserById(decoded.userId));

  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  req.user = user;
  req.sessionId = decoded.sessionId;
  next();
});

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      const decoded = verifyToken(token);
      if (!sessionService.isSessionActive(decoded.userId, decoded.sessionId)) {
        return next();
      }
      const user = attachLegacyRankId(await userService.getUserById(decoded.userId));
      if (user) {
        req.user = user;
        req.sessionId = decoded.sessionId;
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

    if (!roles.includes(req.user.role) && !(roles.includes('admin') && isPrivilegedRole(req.user.role))) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    next();
  };

const authenticateByToken = asyncHandler(async (req, _res, next) => {
  const token = req.headers['x-api-token'] || req.query.api_token;
  if (!token) {
    throw ApiError.unauthorized('API token missing');
  }

  const user = await userService.getUserByApiToken(token);

  if (!user) {
    throw ApiError.unauthorized('Invalid API token');
  }

  if (!isPrivilegedRole(user.role)) {
    throw ApiError.forbidden('Admin access required');
  }

  req.user = user;
  next();
});

module.exports = {
  authenticate,
  optionalAuth,
  authorizeRoles,
  authenticateByToken
};
