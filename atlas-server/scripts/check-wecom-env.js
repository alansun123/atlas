#!/usr/bin/env node
const { getWecomAuthConfig } = require('../src/config/auth');

function mask(value, { keepStart = 3, keepEnd = 2 } = {}) {
  if (!value) return '';
  if (value.length <= keepStart + keepEnd) return '*'.repeat(value.length);
  return `${value.slice(0, keepStart)}***${value.slice(-keepEnd)}`;
}

function validateHttpsRedirect(redirectUri) {
  if (!redirectUri) {
    return { ok: false, reason: 'missing' };
  }

  let parsed;
  try {
    parsed = new URL(redirectUri);
  } catch (_error) {
    return { ok: false, reason: 'invalid-url' };
  }

  if (!['https:', 'http:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'unsupported-protocol' };
  }

  if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    return { ok: false, reason: 'non-https-non-localhost' };
  }

  return {
    ok: true,
    hostname: parsed.hostname,
    protocol: parsed.protocol,
    path: parsed.pathname,
  };
}

function printCheck(ok, label, detail = '') {
  const icon = ok ? '✅' : '❌';
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`${icon} ${label}${suffix}`);
}

function printWarn(label, detail = '') {
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`⚠️  ${label}${suffix}`);
}

function main() {
  const config = getWecomAuthConfig();
  const tokenSecret = process.env.ATLAS_AUTH_TOKEN_SECRET || '';
  const hasTokenSecret = Boolean(tokenSecret);
  const usesDefaultTokenSecret = tokenSecret === 'atlas-dev-secret-change-me';
  const redirectCheck = validateHttpsRedirect(config.redirectUri);
  const missingForReal = [
    !hasTokenSecret ? 'ATLAS_AUTH_TOKEN_SECRET' : null,
    !config.corpId ? 'WECOM_CORP_ID' : null,
    !config.agentId ? 'WECOM_AGENT_ID' : null,
    !config.secret ? 'WECOM_SECRET' : null,
    !config.redirectUri ? 'WECOM_REDIRECT_URI' : null,
  ].filter(Boolean);

  console.log('Atlas WeCom real-auth env readiness');
  console.log('===================================');
  console.log(`configuredMode=${config.configuredMode}`);
  console.log(`effectiveMode=${config.mode}`);
  console.log(`tokenSecret=${hasTokenSecret ? (usesDefaultTokenSecret ? 'present(default-dev-secret)' : 'present(custom)') : '(missing)'}`);
  console.log(`corpId=${config.corpId || '(missing)'}`);
  console.log(`agentId=${config.agentId || '(missing)'}`);
  console.log(`secret=${config.secret ? mask(config.secret) : '(missing)'}`);
  console.log(`redirectUri=${config.redirectUri || '(missing)'}`);
  console.log(`scope=${config.scope}`);
  console.log(`state=${config.state}`);
  console.log(`allowRedirectOverride=${config.allowRedirectOverride}`);
  console.log('');

  printCheck(hasTokenSecret, 'ATLAS_AUTH_TOKEN_SECRET present');
  printCheck(Boolean(config.corpId), 'WECOM_CORP_ID present');
  printCheck(Boolean(config.agentId), 'WECOM_AGENT_ID present');
  printCheck(Boolean(config.secret), 'WECOM_SECRET present');
  printCheck(Boolean(config.redirectUri), 'WECOM_REDIRECT_URI present');
  printCheck(redirectCheck.ok, 'WECOM_REDIRECT_URI format looks acceptable', redirectCheck.reason || '');
  printCheck(config.hasRealCredentials, 'real credential triplet available');

  if (config.configuredMode === 'real' && missingForReal.length > 0) {
    printWarn('ATLAS_WECOM_AUTH_MODE=real but required env is incomplete', `missing: ${missingForReal.join(', ')}`);
  }

  if (usesDefaultTokenSecret) {
    printWarn('ATLAS_AUTH_TOKEN_SECRET is still using the default dev secret', 'real/shared acceptance evidence should use a custom secret');
  }

  if (config.mode !== 'real') {
    printWarn('effective auth mode is not real', 'real E2E acceptance is impossible until effectiveMode=real');
  }

  if (config.allowRedirectOverride) {
    printWarn('ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE is enabled', 'keep this off in shared/acceptance env unless you explicitly need override-based smoke tests');
  }

  console.log('');
  console.log('Required human-confirmed evidence before calling real WeCom auth accepted:');
  console.log('1. WeCom app admin confirms redirect URI exactly matches WECOM_REDIRECT_URI.');
  console.log('2. Three mapped test identities are known: employee / manager / operation manager.');
  console.log('3. At least one unmapped or inactive identity is reserved for pendingAccess verification.');
  console.log('4. Backend run captures evidence for: /api/auth/wework/url, callback success, callback pendingAccess, /api/auth/me after refresh.');
  console.log('');
  console.log('Suggested next commands:');
  console.log('  npm run check:wecom-env');
  console.log('  npm run test:auth');
  console.log('  # then run real env probes against the deployed backend once secrets + callback domain exist');

  if (config.mode === 'real' && hasTokenSecret && !usesDefaultTokenSecret && config.hasRealCredentials && redirectCheck.ok) {
    console.log('');
    console.log('READY_FOR_REAL_AUTH_ENV_CHECK=true');
    process.exitCode = 0;
    return;
  }

  console.log('');
  console.log('READY_FOR_REAL_AUTH_ENV_CHECK=false');
  process.exitCode = 1;
}

main();
