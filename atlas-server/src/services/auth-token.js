const crypto = require('crypto');

const DEFAULT_TTL_SECONDS = Number.parseInt(process.env.ATLAS_AUTH_TOKEN_TTL_SECONDS || '7200', 10);
const SECRET = process.env.ATLAS_AUTH_TOKEN_SECRET || 'atlas-dev-secret-change-me';

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function sign(data) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function issueAccessToken(payload, expiresInSeconds = DEFAULT_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const signature = sign(encodedPayload);
  return {
    accessToken: `${encodedPayload}.${signature}`,
    expiresIn: expiresInSeconds,
  };
}

function verifyAccessToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'missing-or-malformed-token' };
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return { ok: false, reason: 'missing-or-malformed-token' };
  }

  const expectedSignature = sign(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length) {
    return { ok: false, reason: 'invalid-signature' };
  }

  const signatureMatches = crypto.timingSafeEqual(actualBuffer, expectedBuffer);

  if (!signatureMatches) {
    return { ok: false, reason: 'invalid-signature' };
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch (_error) {
    return { ok: false, reason: 'invalid-payload' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    return { ok: false, reason: 'token-expired', payload };
  }

  return { ok: true, payload };
}

module.exports = {
  DEFAULT_TTL_SECONDS,
  issueAccessToken,
  verifyAccessToken,
};
