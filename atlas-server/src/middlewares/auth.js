const { db, getStoreById } = require('../stores');
const { fail } = require('../utils/response');

function resolveUserFromRequest(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  const mockUserId = req.headers['x-mock-user-id'] || token;
  const userId = Number.parseInt(mockUserId, 10);

  if (Number.isNaN(userId)) return null;
  return db.users.find((item) => item.id === userId) || null;
}

function attachUser(req, _res, next) {
  const user = resolveUserFromRequest(req);
  if (user) {
    req.user = {
      ...user,
      store: getStoreById(user.primaryStoreId) || null,
    };
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return fail(res, 2001, '未登录或 token 无效', {}, 401);
  }
  return next();
}

function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}

function requirePermission(permission, message = '无权限执行该操作') {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 2001, '未登录或 token 无效', {}, 401);
    }
    if (!hasPermission(req.user, permission)) {
      return fail(res, 2003, message, { requiredPermission: permission }, 403);
    }
    return next();
  };
}

module.exports = {
  attachUser,
  requireAuth,
  hasPermission,
  requirePermission,
};
