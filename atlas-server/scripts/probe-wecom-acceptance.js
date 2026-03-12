#!/usr/bin/env node
const { getWecomAuthConfig } = require('../src/config/auth');

function parseBaseUrl(raw) {
  if (!raw) {
    throw new Error('ATLAS_BACKEND_BASE_URL is required');
  }

  const url = new URL(raw);
  url.pathname = url.pathname.replace(/\/$/, '');
  return url;
}

function assertCondition(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    if (details !== undefined) {
      error.details = details;
    }
    throw error;
  }
}

function maskToken(token) {
  if (!token) return null;
  if (token.length <= 12) return `${token.slice(0, 4)}***`;
  return `${token.slice(0, 6)}***${token.slice(-4)}`;
}

function buildMalformedToken(validToken) {
  if (!validToken || typeof validToken !== 'string' || !validToken.includes('.')) {
    return 'malformed.invalid';
  }

  const [encodedPayload, signature] = validToken.split('.');
  if (!signature) {
    return 'malformed.invalid';
  }

  const tamperedLastChar = signature.slice(-1) === 'a' ? 'b' : 'a';
  return `${encodedPayload}.${signature.slice(0, -1)}${tamperedLastChar}`;
}

async function requestJson(baseUrl, path, { method = 'GET', body, token } = {}) {
  const url = new URL(path, `${baseUrl.toString()}/`);
  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_error) {
    json = null;
  }

  return {
    status: res.status,
    ok: res.ok,
    text,
    json,
    headers: Object.fromEntries(res.headers.entries()),
  };
}

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function printEvidence(label, payload) {
  console.log(`${label}: ${JSON.stringify(payload, null, 2)}`);
}

async function main() {
  const config = getWecomAuthConfig();
  const baseUrl = parseBaseUrl(process.env.ATLAS_BACKEND_BASE_URL);
  const state = process.env.ATLAS_ACCEPTANCE_STATE || `atlas-acceptance-${Date.now()}`;
  const successCode = process.env.ATLAS_WECOM_SUCCESS_CODE || '';
  const pendingCode = process.env.ATLAS_WECOM_PENDING_CODE || '';

  console.log('Atlas WeCom real-auth acceptance probe');
  console.log('======================================');
  console.log(`baseUrl=${baseUrl.toString()}`);
  console.log(`configuredMode=${config.configuredMode}`);
  console.log(`effectiveMode=${config.mode}`);
  console.log(`state=${state}`);

  assertCondition(config.mode === 'real', 'effective auth mode must be real before running acceptance probe', {
    configuredMode: config.configuredMode,
    effectiveMode: config.mode,
  });

  printSection('login url');
  const loginUrlRes = await requestJson(baseUrl, `/api/auth/wework/url?state=${encodeURIComponent(state)}`);
  assertCondition(loginUrlRes.status === 200, 'GET /api/auth/wework/url must return 200', loginUrlRes.json || loginUrlRes.text);
  const loginData = loginUrlRes.json?.data;
  assertCondition(Boolean(loginData), 'login url response must include data', loginUrlRes.json || loginUrlRes.text);
  assertCondition(loginData.loginType === 'wecom', 'loginType must be wecom', loginData);
  assertCondition(loginData.mode === 'real', 'login url mode must be real', loginData);
  assertCondition(loginData.corpId === config.corpId, 'corpId mismatch between runtime env and endpoint payload', loginData);
  assertCondition(loginData.agentId === config.agentId, 'agentId mismatch between runtime env and endpoint payload', loginData);
  assertCondition(loginData.redirectUri === config.redirectUri, 'redirectUri mismatch between runtime env and endpoint payload', loginData);
  assertCondition(String(loginData.state) === String(state), 'state mismatch in login url payload', loginData);
  printEvidence('loginUrlEvidence', {
    status: loginUrlRes.status,
    mode: loginData.mode,
    loginType: loginData.loginType,
    corpId: loginData.corpId,
    agentId: loginData.agentId,
    redirectUri: loginData.redirectUri,
    state: loginData.state,
    url: loginData.url,
  });

  let issuedToken = null;

  if (successCode) {
    printSection('success callback');
    const successRes = await requestJson(baseUrl, '/api/auth/wework/callback', {
      method: 'POST',
      body: { code: successCode, state },
    });
    assertCondition(successRes.status === 200, 'success callback must return 200', successRes.json || successRes.text);
    const successData = successRes.json?.data;
    assertCondition(Boolean(successData?.accessToken), 'success callback must issue accessToken', successData);
    assertCondition(successData.loginType === 'wecom', 'success callback loginType must be wecom', successData);
    assertCondition(successData.wecomMode === 'real', 'success callback wecomMode must be real', successData);
    assertCondition(successData.pendingAccess !== true, 'success callback must not be pendingAccess', successData);
    issuedToken = successData.accessToken;
    printEvidence('successCallbackEvidence', {
      status: successRes.status,
      loginType: successData.loginType,
      wecomMode: successData.wecomMode,
      tokenPreview: maskToken(successData.accessToken),
      user: successData.user,
    });

    printSection('session continuity');
    const me1 = await requestJson(baseUrl, '/api/auth/me', { token: issuedToken });
    const me2 = await requestJson(baseUrl, '/api/auth/me', { token: issuedToken });
    assertCondition(me1.status === 200, 'first GET /api/auth/me must return 200', me1.json || me1.text);
    assertCondition(me2.status === 200, 'second GET /api/auth/me must return 200', me2.json || me2.text);
    assertCondition(me1.json?.data?.id === me2.json?.data?.id, '/api/auth/me identity must remain stable across token reuse', {
      first: me1.json,
      second: me2.json,
    });
    assertCondition(me1.json?.data?.role === me2.json?.data?.role, '/api/auth/me role must remain stable across token reuse', {
      first: me1.json,
      second: me2.json,
    });
    printEvidence('sessionContinuityEvidence', {
      first: me1.json?.data,
      second: me2.json?.data,
    });
  } else {
    console.log('SKIP success callback: set ATLAS_WECOM_SUCCESS_CODE to capture success-path evidence.');
  }

  if (pendingCode) {
    printSection('pending access callback');
    const pendingRes = await requestJson(baseUrl, '/api/auth/wework/callback', {
      method: 'POST',
      body: { code: pendingCode, state },
    });
    assertCondition(pendingRes.status === 200, 'pending callback must return 200', pendingRes.json || pendingRes.text);
    const pendingData = pendingRes.json?.data;
    assertCondition(pendingData?.pendingAccess === true, 'pending callback must mark pendingAccess=true', pendingData);
    assertCondition(pendingData?.accessToken === null, 'pending callback must not issue accessToken', pendingData);
    assertCondition(['unmapped', 'inactive', 'unusable'].includes(pendingData?.accessState), 'pending callback accessState must be truthful', pendingData);
    printEvidence('pendingAccessEvidence', {
      status: pendingRes.status,
      pendingAccess: pendingData.pendingAccess,
      accessState: pendingData.accessState,
      user: pendingData.user,
    });
  } else {
    console.log('SKIP pending access callback: set ATLAS_WECOM_PENDING_CODE to capture negative-path pendingAccess evidence.');
  }

  printSection('invalid session');
  const invalidRes = await requestJson(baseUrl, '/api/auth/me');
  assertCondition(invalidRes.status === 401, 'GET /api/auth/me without token must return 401', invalidRes.json || invalidRes.text);

  let malformedTokenEvidence = null;
  if (issuedToken) {
    const malformedToken = buildMalformedToken(issuedToken);
    const malformedRes = await requestJson(baseUrl, '/api/auth/me', { token: malformedToken });
    assertCondition(malformedRes.status === 401, 'GET /api/auth/me with malformed token must return 401', malformedRes.json || malformedRes.text);
    malformedTokenEvidence = {
      status: malformedRes.status,
      reason: malformedRes.json?.data?.reason || null,
      tokenPreview: maskToken(malformedToken),
    };
  }

  printEvidence('invalidSessionEvidence', {
    missingToken: {
      status: invalidRes.status,
      body: invalidRes.json || invalidRes.text,
    },
    malformedToken: malformedTokenEvidence,
  });

  if (issuedToken) {
    printSection('logout contract');
    const logoutRes = await requestJson(baseUrl, '/api/auth/logout', {
      method: 'POST',
      token: issuedToken,
    });
    assertCondition(logoutRes.status === 200, 'POST /api/auth/logout with valid token must return 200', logoutRes.json || logoutRes.text);
    assertCondition(logoutRes.json?.data?.tokenInvalidation === 'not_implemented_stateless_logout', 'logout contract must stay explicit/stateless', logoutRes.json || logoutRes.text);
    printEvidence('logoutEvidence', logoutRes.json?.data || logoutRes.json || logoutRes.text);
  } else {
    console.log('SKIP logout contract: success callback token not available in this run.');
  }

  console.log('\nACCEPTANCE_PROBE_COMPLETE=true');
}

main().catch((error) => {
  console.error('\nACCEPTANCE_PROBE_COMPLETE=false');
  console.error(`ERROR=${error.message}`);
  if (error.details !== undefined) {
    console.error(`DETAILS=${JSON.stringify(error.details, null, 2)}`);
  }
  process.exitCode = 1;
});
