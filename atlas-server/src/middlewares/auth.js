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

module.exports = {
  attachUser,
  requireAuth,
};
