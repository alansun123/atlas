const assert = require('assert');
process.env.ATLAS_AUTH_TOKEN_SECRET = 'test-secret';
const { app } = require('./src/app');

async function run() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

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

  async function login(userId) {
    const res = await request('/api/auth/mock-login', {
      method: 'POST',
      body: { userId },
    });
    assert.equal(res.status, 200);
    return res.json.data.accessToken;
  }

  try {
    const employeeToken = await login(102);
    const managerToken = await login(101);
    const opToken = await login(201);

    const employeeCreate = await request('/api/schedules/batches', {
      method: 'POST',
      token: employeeToken,
      body: {
        storeId: 1,
        weekStartDate: '2026-03-23',
        weekEndDate: '2026-03-29',
        entries: [],
      },
    });
    assert.equal(employeeCreate.status, 403);

    const submitByManager = await request('/api/schedules/batches/10001/submit-approval', {
      method: 'POST',
      token: managerToken,
      body: { triggerReasons: ['UNDER_MIN_STAFF'] },
    });
    assert.equal(submitByManager.status, 200);
    const approvalId = submitByManager.json.data.approvalId;
    assert.ok(approvalId);

    const managerApprove = await request(`/api/approvals/${approvalId}/approve`, {
      method: 'POST',
      token: managerToken,
      body: { comment: 'try approve' },
    });
    assert.equal(managerApprove.status, 403);

    const employeeMe = await request('/api/schedules/me', {
      method: 'GET',
      token: employeeToken,
    });
    assert.equal(employeeMe.status, 200);
    assert.equal(employeeMe.json.data.appliedStatus, 'published');
    assert.equal(employeeMe.json.data.list.length, 0);

    const opApprove = await request(`/api/approvals/${approvalId}/approve`, {
      method: 'POST',
      token: opToken,
      body: { comment: 'approved' },
    });
    assert.equal(opApprove.status, 200);
    assert.equal(opApprove.json.data.scheduleBatchStatus, 'approved');

    const publishByManager = await request('/api/schedules/batches/10001/publish', {
      method: 'POST',
      token: managerToken,
      body: { notifyEmployees: true },
    });
    assert.equal(publishByManager.status, 200);
    assert.equal(publishByManager.json.data.status, 'published');

    const employeeMePublished = await request('/api/schedules/me', {
      method: 'GET',
      token: employeeToken,
    });
    assert.equal(employeeMePublished.status, 200);
    assert.equal(employeeMePublished.json.data.list.length, 1);
    assert.equal(employeeMePublished.json.data.list[0].status, 'published');

    console.log('RBAC/state smoke passed');
  } finally {
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
