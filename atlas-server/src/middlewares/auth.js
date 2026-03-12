const { db, getStoreById } = require('../stores');
const { fail } = require('../utils/response');
const { verifyAccessToken } = require('../services/auth-token');

function buildUserPayload(user) {
  return {
    ...user,
    store: getStoreById(user.primaryStoreId) || null,
  };
}

function isUserUsable(user) {
  return Boolean(
    user
    && user.status === 'active'
    && user.role
    && user.primaryStoreId
    && Array.isArray(user.permissions)
    && user.permissions.length > 0,
  );
}

function extractBearerToken(req) {
  return req.headers.authorization?.replace(/^Bearer\s+/i, '').trim() || '';
}

function resolveUserFromVerifiedToken(tokenPayload) {
  if (!tokenPayload?.userId) return null;

  const user = db.users.find((item) => item.id === Number(tokenPayload.userId));
  if (!user) return null;
  if (tokenPayload.weworkUserId && user.weworkUserId !== tokenPayload.weworkUserId) {
    return null;
  }

  return user;
}

function attachUser(req, _res, next) {
  const token = extractBearerToken(req);
  req.auth = {
    token: token || null,
    verified: false,
    error: null,
    pendingAccess: false,
    accessState: null,
  };

  if (!token) {
    return next();
  }

  const verification = verifyAccessToken(token);
  if (!verification.ok) {
    req.auth.error = verification.reason;
    return next();
  }

  const user = resolveUserFromVerifiedToken(verification.payload);
  req.auth.verified = true;
  req.auth.tokenPayload = verification.payload;

  if (!user) {
    req.auth.pendingAccess = true;
    req.auth.accessState = 'unmapped';
    return next();
  }

  if (user.status !== 'active') {
    req.auth.pendingAccess = true;
    req.auth.accessState = 'inactive';
    req.auth.identity = {
      weworkUserId: user.weworkUserId,
      name: user.name,
    };
    return next();
  }

  if (!isUserUsable(user)) {
    req.auth.pendingAccess = true;
    req.auth.accessState = 'unusable';
    req.auth.identity = {
      weworkUserId: user.weworkUserId,
      name: user.name,
    };
    return next();
  }

  req.user = buildUserPayload(user);
  return next();
}

function buildPendingAccessData(req) {
  return {
    pendingAccess: true,
    accessState: req.auth?.accessState || 'unmapped',
    user: req.auth?.identity || {
      weworkUserId: req.auth?.tokenPayload?.weworkUserId || null,
      name: req.auth?.tokenPayload?.name || '',
    },
  };
}

function requireAuth(req, res, next) {
  if (req.user) {
    return next();
  }

  if (req.auth?.pendingAccess) {
    return fail(res, 2004, '账号待开通或暂不可用', buildPendingAccessData(req), 403);
  }

  return fail(res, 2001, '未登录或 token 无效', {
    reason: req.auth?.error || 'missing-token',
  }, 401);
}

function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}

function requirePermission(permission, message = '无权限执行该操作') {
  return (req, res, next) => {
    if (!req.user) {
      return requireAuth(req, res, next);
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
  buildUserPayload,
  isUserUsable,
};
