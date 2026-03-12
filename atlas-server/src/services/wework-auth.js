const DEFAULT_MODE = process.env.ATLAS_WECOM_AUTH_MODE || 'stub';

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

async function exchangeCodeForIdentity(code) {
  if (!code) {
    return { ok: false, reason: 'missing-code' };
  }

  let identity = null;
  if (DEFAULT_MODE === 'env') {
    identity = await resolveViaEnv(code);
  } else {
    identity = await resolveViaStub(code);
  }

  if (!identity) {
    return {
      ok: false,
      reason: 'identity-not-resolved',
      mode: DEFAULT_MODE,
    };
  }

  return {
    ok: true,
    identity,
    mode: DEFAULT_MODE,
  };
}

module.exports = {
  exchangeCodeForIdentity,
};
