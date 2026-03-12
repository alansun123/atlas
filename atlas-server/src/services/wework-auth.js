const { getWecomAuthConfig } = require('../config/auth');

function parseCodeMap() {
  const raw = process.env.ATLAS_WECOM_CODE_MAP;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function normalizeResolvedIdentity(value, code, source) {
  if (typeof value === 'string') {
    return {
      weworkUserId: value,
      name: '',
      source,
      code,
    };
  }

  if (!value || typeof value !== 'object' || !value.weworkUserId) {
    return null;
  }

  return {
    weworkUserId: value.weworkUserId,
    name: value.name || '',
    source,
    code,
  };
}

async function resolveViaStub(code) {
  const codeMap = parseCodeMap();
  const mapped = codeMap[code];
  if (mapped) {
    return normalizeResolvedIdentity(mapped, code, 'stub-map');
  }

  if (code.startsWith('stub:') || code.startsWith('mock:')) {
    const weworkUserId = code.split(':').slice(1).join(':').trim();
    if (!weworkUserId) {
      return null;
    }
    return {
      weworkUserId,
      name: '',
      source: 'stub-code',
      code,
    };
  }

  return null;
}

async function resolveViaEnv(code) {
  const weworkUserId = process.env.ATLAS_WECOM_STUB_USER_ID;
  if (!weworkUserId) return null;

  return {
    weworkUserId,
    name: process.env.ATLAS_WECOM_STUB_USER_NAME || '',
    source: 'env-stub-user',
    code,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  let body = null;
  try {
    body = await response.json();
  } catch (_error) {
    return {
      ok: false,
      reason: 'invalid-json',
      status: response.status,
      body: null,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: 'http-error',
      status: response.status,
      body,
    };
  }

  return {
    ok: true,
    status: response.status,
    body,
  };
}

function buildWecomOauthUrl({ state, redirectUri } = {}) {
  const config = getWecomAuthConfig();
  const effectiveRedirectUri = redirectUri && config.allowRedirectOverride ? redirectUri : config.redirectUri;

  if (!config.corpId || !config.agentId || !effectiveRedirectUri) {
    return {
      ok: false,
      reason: 'missing-wecom-oauth-config',
      mode: config.mode,
      missing: [
        !config.corpId ? 'WECOM_CORP_ID' : null,
        !config.agentId ? 'WECOM_AGENT_ID' : null,
        !effectiveRedirectUri ? 'WECOM_REDIRECT_URI' : null,
      ].filter(Boolean),
    };
  }

  const params = new URLSearchParams({
    appid: config.corpId,
    redirect_uri: effectiveRedirectUri,
    response_type: 'code',
    scope: config.scope,
    state: state || config.state,
    agentid: config.agentId,
  });

  return {
    ok: true,
    mode: config.mode,
    configuredMode: config.configuredMode,
    url: `${config.authUrlBase}?${params.toString()}#wechat_redirect`,
    redirectUri: effectiveRedirectUri,
    scope: config.scope,
    state: state || config.state,
    agentId: config.agentId,
    corpId: config.corpId,
  };
}

async function resolveViaRealWecom(code) {
  const config = getWecomAuthConfig();

  if (!config.hasRealCredentials) {
    return {
      ok: false,
      reason: 'missing-wecom-credentials',
      mode: config.mode,
    };
  }

  try {
    const tokenUrl = new URL(config.accessTokenUrl);
    tokenUrl.searchParams.set('corpid', config.corpId);
    tokenUrl.searchParams.set('corpsecret', config.secret);

    const tokenResponse = await fetchJson(tokenUrl.toString());
    if (!tokenResponse.ok) {
      return {
        ok: false,
        reason: 'wecom-access-token-request-failed',
        mode: config.mode,
        detail: tokenResponse,
      };
    }

    if (tokenResponse.body.errcode !== 0 || !tokenResponse.body.access_token) {
      return {
        ok: false,
        reason: 'wecom-access-token-exchange-failed',
        mode: config.mode,
        detail: tokenResponse.body,
      };
    }

    const userInfoUrl = new URL(config.userInfoUrl);
    userInfoUrl.searchParams.set('access_token', tokenResponse.body.access_token);
    userInfoUrl.searchParams.set('code', code);

    const userInfoResponse = await fetchJson(userInfoUrl.toString());
    if (!userInfoResponse.ok) {
      return {
        ok: false,
        reason: 'wecom-userinfo-request-failed',
        mode: config.mode,
        detail: userInfoResponse,
      };
    }

    if (userInfoResponse.body.errcode !== 0 || !userInfoResponse.body.UserId) {
      return {
        ok: false,
        reason: 'wecom-userinfo-exchange-failed',
        mode: config.mode,
        detail: userInfoResponse.body,
      };
    }

    let name = '';
    try {
      const detailUrl = new URL(config.userDetailUrl);
      detailUrl.searchParams.set('access_token', tokenResponse.body.access_token);
      detailUrl.searchParams.set('userid', userInfoResponse.body.UserId);
      const detailResponse = await fetchJson(detailUrl.toString());
      if (detailResponse.ok && detailResponse.body.errcode === 0) {
        name = detailResponse.body.name || '';
      }
    } catch (_error) {
      // best-effort only
    }

    return {
      ok: true,
      identity: {
        weworkUserId: userInfoResponse.body.UserId,
        name,
        source: 'wecom-api',
        code,
      },
      mode: config.mode,
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'wecom-request-threw',
      mode: config.mode,
      detail: error.message,
    };
  }
}

async function exchangeCodeForIdentity(code) {
  if (!code) {
    return { ok: false, reason: 'missing-code' };
  }

  const config = getWecomAuthConfig();

  if (config.mode === 'real') {
    return resolveViaRealWecom(code);
  }

  let identity = null;
  if (config.mode === 'env') {
    identity = await resolveViaEnv(code);
  } else {
    identity = await resolveViaStub(code);
  }

  if (!identity) {
    return {
      ok: false,
      reason: 'identity-not-resolved',
      mode: config.mode,
    };
  }

  return {
    ok: true,
    identity,
    mode: config.mode,
  };
}

module.exports = {
  buildWecomOauthUrl,
  exchangeCodeForIdentity,
};
