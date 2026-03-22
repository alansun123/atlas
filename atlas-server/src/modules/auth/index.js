const express = require('express');
const { db } = require('../../stores');
const { requireAuth, buildUserPayload, isUserUsable } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');
const { issueAccessToken, DEFAULT_TTL_SECONDS } = require('../../services/auth-token');
const { exchangeCodeForIdentity, buildWecomOauthUrl } = require('../../services/wework-auth');
const { logAuthEvent } = require('../../utils/auth-log');

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
    logAuthEvent(req, 'wecom_oauth_url_failed', {
      outcome: 'config_error',
      mode: resolved.mode,
      reason: resolved.reason,
      missing: resolved.missing || [],
    });
    return fail(res, 2001, '企业微信授权地址配置不完整', {
      reason: resolved.reason,
      mode: resolved.mode,
      missing: resolved.missing || [],
    }, 503);
  }

  logAuthEvent(req, 'wecom_oauth_url_built', {
    outcome: 'ok',
    mode: resolved.mode,
    configuredMode: resolved.configuredMode,
    redirectOverrideApplied: Boolean(req.query.redirectUri && resolved.redirectUri === req.query.redirectUri),
  });
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

router.get('/wework/qr', (req, res) => {
  const corpId = process.env.WECOM_CORP_ID;
  const agentId = process.env.WECOM_AGENT_ID;
  
  if (!corpId || !agentId) {
    return fail(res, 2001, '企业微信配置不完整', {}, 503);
  }
  
  const callbackUrl = encodeURIComponent(process.env.WECOM_REDIRECT_URI || 'https://atlas-atlas.loca.lt/auth/callback');
  const state = Math.random().toString(36).substring(2);
  
  const qrUrl = `https://open.work.weixin.qq.com/wwopen/sso/3rd_qrconnect?appid=${corpId}&agentid=${agentId}&redirect_uri=${callbackUrl}&state=${state}`;
  
  logAuthEvent(req, 'wecom_qr_url_built', { outcome: 'ok', state });
  
  return success(res, { qrUrl, state, expiresIn: 300 });
});
router.post('/mock/login', handleMockLogin);

router.post('/wework/callback', async (req, res) => {

router.get('/wework/callback', async (req, res) => {
  const code = String(req.query.code || '' ).trim();
  const state = String(req.query.state || '' ).trim();
  
  if (!code) {
    logAuthEvent(req, 'wecom_callback_failed', { outcome: 'bad_request', reason: 'missing-code' });
    return fail(res, 1001, 'code 不能为空');
  }
  
  const resolved = await exchangeCodeForIdentity(code);
  if (!resolved.ok) {
    logAuthEvent(req, 'wecom_callback_failed', { outcome: 'identity_not_resolved', mode: resolved.mode || null, reason: resolved.reason });
    return fail(res, 2001, '企业微信登录失败，未能解析用户身份', { reason: resolved.reason, mode: resolved.mode || null }, 401);
  }
  
  const identity = resolved;
  const existingUser = db.users.find(u => u.weworkUserId === identity.weworkUserId);
  
  if (!existingUser) {
    const pendingPayload = buildPendingAccessPayload(identity, 'not_found');
    logAuthEvent(req, 'wecom_callback_new_user', { weworkUserId: identity.weworkUserId, name: identity.name });
    return res.redirect(`https://atlas-atlas.loca.lt/pending-access?weworkUserId=${encodeURIComponent(identity.weworkUserId)}`);
  }
  
  if (existingUser.status !== 'active' || !isUserUsable(existingUser)) {
    const pendingPayload = buildPendingAccessPayload(identity, existingUser.status !== 'active' ? 'inactive' : 'unusable');
    logAuthEvent(req, 'wecom_callback_inactive_user', { weworkUserId: identity.weworkUserId });
    return res.redirect(`https://atlas-atlas.loca.lt/pending-access?weworkUserId=${encodeURIComponent(identity.weworkUserId)}`);
  }
  
  const session = issueSessionForUser(existingUser, 'wecom');
  logAuthEvent(req, 'wecom_callback_ok', { userId: existingUser.id, weworkUserId: identity.weworkUserId });
  
  return res.redirect(`https://atlas-atlas.loca.lt/home?token=${encodeURIComponent(session.accessToken)}`);
});
  const { code } = req.body || {};

  if (!code) {
    logAuthEvent(req, 'wecom_callback_failed', {
      outcome: 'bad_request',
      reason: 'missing-code',
    });
    return fail(res, 1001, 'code 不能为空');
  }

  const resolved = await exchangeCodeForIdentity(code);
  if (!resolved.ok) {
    logAuthEvent(req, 'wecom_callback_failed', {
      outcome: 'identity_not_resolved',
      mode: resolved.mode || null,
      reason: resolved.reason,
    });
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
    logAuthEvent(req, 'wecom_callback_pending_access', {
      outcome: 'pending_access',
      mode: resolved.mode,
      accessState: 'unmapped',
      weworkUserId: identity.weworkUserId,
    });
    return success(res, buildPendingAccessPayload(identity, 'unmapped'));
  }

  if (user.status !== 'active') {
    logAuthEvent(req, 'wecom_callback_pending_access', {
      outcome: 'pending_access',
      mode: resolved.mode,
      accessState: 'inactive',
      userId: user.id,
      weworkUserId: identity.weworkUserId,
    });
    return success(res, buildPendingAccessPayload(identity, 'inactive'));
  }

  if (!isUserUsable(user)) {
    logAuthEvent(req, 'wecom_callback_pending_access', {
      outcome: 'pending_access',
      mode: resolved.mode,
      accessState: 'unusable',
      userId: user.id,
      weworkUserId: identity.weworkUserId,
    });
    return success(res, buildPendingAccessPayload(identity, 'unusable'));
  }

  logAuthEvent(req, 'wecom_callback_login_succeeded', {
    outcome: 'authenticated',
    mode: resolved.mode,
    userId: user.id,
    role: user.role,
    weworkUserId: identity.weworkUserId,
  });
  return success(res, issueSessionForUser(user, 'wecom', {
    wecomMode: resolved.mode,
  }));
});

router.get('/me', requireAuth, (req, res) => {
  logAuthEvent(req, 'auth_me_succeeded', {
    outcome: 'authenticated',
    userId: req.user.id,
    role: req.user.role,
    loginType: req.auth?.tokenPayload?.loginType || null,
    weworkUserId: req.user.weworkUserId,
  });
  return success(res, req.user);
});

router.post('/logout', requireAuth, (req, res) => {
  logAuthEvent(req, 'auth_logout_acknowledged', {
    outcome: 'stateless_ack',
    userId: req.user.id,
    role: req.user.role,
    loginType: req.auth?.tokenPayload?.loginType || null,
    weworkUserId: req.user.weworkUserId,
  });
  return success(res, {
  success: true,
  loggedOutUserId: req.user.id,
  tokenInvalidation: 'not_implemented_stateless_logout',
  expiresIn: DEFAULT_TTL_SECONDS,
});
});

module.exports = router;
