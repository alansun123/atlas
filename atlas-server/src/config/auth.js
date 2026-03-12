function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeMode(rawMode, hasRealCredentials) {
  const mode = String(rawMode || 'auto').trim().toLowerCase();

  if (mode === 'real') return 'real';
  if (mode === 'stub') return 'stub';
  if (mode === 'env') return 'env';
  if (mode === 'auto') return hasRealCredentials ? 'real' : 'stub';

  return hasRealCredentials ? 'real' : 'stub';
}

function getWecomAuthConfig() {
  const corpId = process.env.WECOM_CORP_ID || process.env.ATLAS_WECOM_CORP_ID || '';
  const agentId = process.env.WECOM_AGENT_ID || process.env.ATLAS_WECOM_AGENT_ID || '';
  const secret = process.env.WECOM_SECRET || process.env.ATLAS_WECOM_SECRET || '';
  const redirectUri = process.env.WECOM_REDIRECT_URI || process.env.ATLAS_WECOM_REDIRECT_URI || '';
  const scope = process.env.WECOM_SCOPE || process.env.ATLAS_WECOM_SCOPE || 'snsapi_base';
  const state = process.env.WECOM_STATE || process.env.ATLAS_WECOM_STATE || 'atlas';
  const allowRedirectOverride = parseBoolean(process.env.ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE, true);
  const accessTokenUrl = process.env.WECOM_ACCESS_TOKEN_URL || process.env.ATLAS_WECOM_ACCESS_TOKEN_URL || 'https://qyapi.weixin.qq.com/cgi-bin/gettoken';
  const userInfoUrl = process.env.WECOM_USERINFO_URL || process.env.ATLAS_WECOM_USERINFO_URL || 'https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo';
  const userDetailUrl = process.env.WECOM_USER_DETAIL_URL || process.env.ATLAS_WECOM_USER_DETAIL_URL || 'https://qyapi.weixin.qq.com/cgi-bin/user/get';
  const hasRealCredentials = Boolean(corpId && agentId && secret);
  const configuredMode = process.env.ATLAS_WECOM_AUTH_MODE || 'auto';
  const mode = normalizeMode(configuredMode, hasRealCredentials);

  return {
    mode,
    configuredMode,
    corpId,
    agentId,
    secret,
    redirectUri,
    scope,
    state,
    allowRedirectOverride,
    accessTokenUrl,
    userInfoUrl,
    userDetailUrl,
    hasRealCredentials,
    authUrlBase: 'https://open.weixin.qq.com/connect/oauth2/authorize',
  };
}

module.exports = {
  getWecomAuthConfig,
};
