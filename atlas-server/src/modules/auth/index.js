const express = require('express');
const { db } = require('../../stores');
const { requireAuth, buildUserPayload, isUserUsable } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');
const { issueAccessToken, DEFAULT_TTL_SECONDS } = require('../../services/auth-token');
const { exchangeCodeForIdentity, buildWecomOauthUrl } = require('../../services/wework-auth');

const router = express.Router();

function issueSessionForUser(user, loginType, extra = {}) {
  const { accessToken, expiresIn } = issueAccessToken({
    userId: user.id,
    weworkUserId: user.weworkUserId,
    role: user.role,
    name: user.name,
    loginType,
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn,
    loginType,
    ...extra,
    user: buildUserPayload(user),
  };
}

function buildPendingAccessPayload(identity, accessState) {
  return {
    accessToken: null,
    tokenType: 'Bearer',
    expiresIn: 0,
    loginType: 'wecom',
    pendingAccess: true,
    accessState,
    user: {
      weworkUserId: identity.weworkUserId,
      name: identity.name || '',
    },
  };
}

function handleMockLogin(req, res) {
  const { userId, weworkUserId } = req.body || {};

  const user = db.users.find((item) => (
    (userId && item.id === Number(userId)) ||
    (weworkUserId && item.weworkUserId === weworkUserId)
  ));

  if (!user) {
    return fail(res, 2001, 'mock 用户不存在', { supportedUserIds: db.users.map((item) => item.id) }, 404);
  }

  if (user.status !== 'active' || !isUserUsable(user)) {
    return fail(res, 2004, 'mock 用户不可用于演示登录', {
      pendingAccess: true,
      accessState: user.status !== 'active' ? 'inactive' : 'unusable',
      user: {
        weworkUserId: user.weworkUserId,
        name: user.name,
      },
    }, 403);
  }

  return success(res, issueSessionForUser(user, 'mock', {
    mockOnly: true,
    authMode: 'mock',
  }));
}

router.get('/wework/url', (req, res) => {
  const resolved = buildWecomOauthUrl({
    state: req.query.state,
    redirectUri: req.query.redirectUri,
  });

  if (!resolved.ok) {
    return fail(res, 2001, '企业微信授权地址配置不完整', {
      reason: resolved.reason,
      mode: resolved.mode,
      missing: resolved.missing || [],
    }, 503);
  }

  return success(res, {
    url: resolved.url,
    loginType: 'wecom',
    mode: resolved.mode,
    configuredMode: resolved.configuredMode,
    corpId: resolved.corpId,
    agentId: resolved.agentId,
    redirectUri: resolved.redirectUri,
    scope: resolved.scope,
    state: resolved.state,
  });
});

router.post('/mock-login', handleMockLogin);
router.post('/mock/login', handleMockLogin);

router.post('/wework/callback', async (req, res) => {
  const { code } = req.body || {};

  if (!code) {
    return fail(res, 1001, 'code 不能为空');
  }

  const resolved = await exchangeCodeForIdentity(code);
  if (!resolved.ok) {
    return fail(res, 2001, '企业微信登录失败，未能解析用户身份', {
      reason: resolved.reason,
      mode: resolved.mode || null,
      code,
      detail: resolved.detail || null,
    }, 401);
  }

  const identity = resolved.identity;
  const user = db.users.find((item) => item.weworkUserId === identity.weworkUserId) || null;

  if (!user) {
    return success(res, buildPendingAccessPayload(identity, 'unmapped'));
  }

  if (user.status !== 'active') {
    return success(res, buildPendingAccessPayload(identity, 'inactive'));
  }

  if (!isUserUsable(user)) {
    return success(res, buildPendingAccessPayload(identity, 'unusable'));
  }

  return success(res, issueSessionForUser(user, 'wecom', {
    wecomMode: resolved.mode,
  }));
});

router.get('/me', requireAuth, (req, res) => success(res, req.user));

router.post('/logout', requireAuth, (req, res) => success(res, {
  success: true,
  loggedOutUserId: req.user.id,
  tokenInvalidation: 'not_implemented_stateless_logout',
  expiresIn: DEFAULT_TTL_SECONDS,
}));

module.exports = router;
