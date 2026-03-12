const assert = require('assert');
const express = require('express');

process.env.ATLAS_AUTH_TOKEN_SECRET = 'test-secret';
process.env.ATLAS_WECOM_AUTH_MODE = 'stub';
process.env.WECOM_CORP_ID = 'ww-test-corp';
process.env.WECOM_AGENT_ID = '1000001';
process.env.WECOM_REDIRECT_URI = 'https://atlas.example.com/auth/wework/callback';
process.env.ATLAS_WECOM_CODE_MAP = JSON.stringify({
  active_manager_code: { weworkUserId: 'manager_zhangsan', name: '张三' },
  inactive_code: { weworkUserId: 'blocked_user', name: '冻结用户' },
  unusable_code: { weworkUserId: 'no_scope_user', name: '无权限用户' },
  unmapped_code: { weworkUserId: 'external_only_user', name: '外部用户' }
});

const { app } = require('./src/app');
const { db } = require('./src/stores');

async function run() {
  db.users.push(
    {
      id: 901,
      weworkUserId: 'blocked_user',
      name: '冻结用户',
      mobile: '13800000901',
      role: 'employee',
      status: 'inactive',
      joinedAt: '2026-03-01T09:00:00.000Z',
      permissions: ['schedule:read:self'],
      primaryStoreId: 1,
    },
    {
      id: 902,
      weworkUserId: 'no_scope_user',
      name: '无权限用户',
      mobile: '13800000902',
      role: '',
      status: 'active',
      joinedAt: '2026-03-01T09:00:00.000Z',
      permissions: [],
      primaryStoreId: null,
    },
  );

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const wecomStubApp = express();
  wecomStubApp.get('/cgi-bin/gettoken', (req, res) => {
    assert.equal(req.query.corpid, process.env.WECOM_CORP_ID);
    assert.equal(req.query.corpsecret, process.env.WECOM_SECRET);
    res.json({ errcode: 0, errmsg: 'ok', access_token: 'mock-wecom-access-token' });
  });
  wecomStubApp.get('/cgi-bin/auth/getuserinfo', (req, res) => {
    assert.equal(req.query.access_token, 'mock-wecom-access-token');
    if (req.query.code === 'real_manager_code') {
      return res.json({ errcode: 0, errmsg: 'ok', UserId: 'manager_zhangsan' });
    }
    return res.json({ errcode: 40029, errmsg: 'invalid code' });
  });
  wecomStubApp.get('/cgi-bin/user/get', (req, res) => {
    assert.equal(req.query.access_token, 'mock-wecom-access-token');
    if (req.query.userid === 'manager_zhangsan') {
      return res.json({ errcode: 0, errmsg: 'ok', userid: 'manager_zhangsan', name: '张三' });
    }
    return res.json({ errcode: 60111, errmsg: 'user not found' });
  });

  const wecomServer = wecomStubApp.listen(0);
  await new Promise((resolve) => wecomServer.once('listening', resolve));
  const wecomPort = wecomServer.address().port;
  const wecomBase = `http://127.0.0.1:${wecomPort}`;

  async function request(path, { method = 'GET', token, body } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: res.status,
      json: await res.json(),
    };
  }

  try {
    const weworkUrl = await request('/api/auth/wework/url?state=test-state');
    assert.equal(weworkUrl.status, 200);
    assert.equal(weworkUrl.json.data.loginType, 'wecom');
    assert.equal(weworkUrl.json.data.mode, 'stub');
    assert.ok(weworkUrl.json.data.url.includes('open.weixin.qq.com/connect/oauth2/authorize'));
    assert.ok(weworkUrl.json.data.url.includes('state=test-state'));
    assert.ok(weworkUrl.json.data.url.includes(encodeURIComponent(process.env.WECOM_REDIRECT_URI)));

    const activeCallback = await request('/api/auth/wework/callback', {
      method: 'POST',
      body: { code: 'active_manager_code' },
    });
    assert.equal(activeCallback.status, 200);
    assert.ok(activeCallback.json.data.accessToken);
    assert.equal(activeCallback.json.data.loginType, 'wecom');
    assert.equal(activeCallback.json.data.user.id, 101);

    const me = await request('/api/auth/me', {
      token: activeCallback.json.data.accessToken,
    });
    assert.equal(me.status, 200);
    assert.equal(me.json.data.id, 101);

    const malformedToken = `${activeCallback.json.data.accessToken.slice(0, -1)}x`;
    const malformedMe = await request('/api/auth/me', {
      token: malformedToken,
    });
    assert.equal(malformedMe.status, 401);
    assert.equal(malformedMe.json.data.reason, 'invalid-signature');

    const unmapped = await request('/api/auth/wework/callback', {
      method: 'POST',
      body: { code: 'unmapped_code' },
    });
    assert.equal(unmapped.status, 200);
    assert.equal(unmapped.json.data.pendingAccess, true);
    assert.equal(unmapped.json.data.accessToken, null);
    assert.equal(unmapped.json.data.accessState, 'unmapped');

    const inactive = await request('/api/auth/wework/callback', {
      method: 'POST',
      body: { code: 'inactive_code' },
    });
    assert.equal(inactive.status, 200);
    assert.equal(inactive.json.data.pendingAccess, true);
    assert.equal(inactive.json.data.accessState, 'inactive');

    const unusable = await request('/api/auth/wework/callback', {
      method: 'POST',
      body: { code: 'unusable_code' },
    });
    assert.equal(unusable.status, 200);
    assert.equal(unusable.json.data.pendingAccess, true);
    assert.equal(unusable.json.data.accessState, 'unusable');

    const unknownCode = await request('/api/auth/wework/callback', {
      method: 'POST',
      body: { code: 'unknown_code' },
    });
    assert.equal(unknownCode.status, 401);
    assert.equal(unknownCode.json.code, 2001);

    process.env.ATLAS_WECOM_AUTH_MODE = 'real';
    process.env.WECOM_SECRET = 'real-mode-secret';
    process.env.ATLAS_WECOM_ACCESS_TOKEN_URL = `${wecomBase}/cgi-bin/gettoken`;
    process.env.ATLAS_WECOM_USERINFO_URL = `${wecomBase}/cgi-bin/auth/getuserinfo`;
    process.env.ATLAS_WECOM_USER_DETAIL_URL = `${wecomBase}/cgi-bin/user/get`;

    const realModeCallback = await request('/api/auth/wework/callback', {
      method: 'POST',
      body: { code: 'real_manager_code' },
    });
    assert.equal(realModeCallback.status, 200);
    assert.equal(realModeCallback.json.data.wecomMode, 'real');
    assert.equal(realModeCallback.json.data.user.weworkUserId, 'manager_zhangsan');
    assert.ok(realModeCallback.json.data.accessToken);

    const realModeUrl = await request('/api/auth/wework/url?state=real-mode');
    assert.equal(realModeUrl.status, 200);
    assert.equal(realModeUrl.json.data.mode, 'real');
    assert.ok(realModeUrl.json.data.url.includes('state=real-mode'));

    process.env.ATLAS_WECOM_AUTH_MODE = 'stub';
    delete process.env.WECOM_SECRET;
    delete process.env.ATLAS_WECOM_ACCESS_TOKEN_URL;
    delete process.env.ATLAS_WECOM_USERINFO_URL;
    delete process.env.ATLAS_WECOM_USER_DETAIL_URL;

    const mockLogin = await request('/api/auth/mock-login', {
      method: 'POST',
      body: { userId: 102 },
    });
    assert.equal(mockLogin.status, 200);
    assert.ok(mockLogin.json.data.accessToken.includes('.'));
    assert.equal(mockLogin.json.data.mockOnly, true);

    const mockMe = await request('/api/auth/me', {
      token: mockLogin.json.data.accessToken,
    });
    assert.equal(mockMe.status, 200);
    assert.equal(mockMe.json.data.id, 102);

    console.log('Auth smoke passed');
  } finally {
    db.users = db.users.filter((item) => ![901, 902].includes(item.id));
    server.close();
    wecomServer.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
