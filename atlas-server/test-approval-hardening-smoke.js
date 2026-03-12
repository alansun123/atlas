const assert = require('assert');
process.env.ATLAS_AUTH_TOKEN_SECRET = 'test-secret';
const { app } = require('./src/app');
const { db } = require('./src/stores');

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

  const originalApprovals = JSON.parse(JSON.stringify(db.approvals));
  const originalBatches = JSON.parse(JSON.stringify(db.scheduleBatches));

  try {
    db.approvals = [];
    db.scheduleBatches = db.scheduleBatches.map((batch) => {
      if (batch.id !== 10001) return batch;
      return {
        ...batch,
        status: 'draft',
        submittedBy: null,
        submittedAt: null,
        updatedAt: batch.updatedAt,
      };
    });

    const managerToken = await login(101);
    const opToken = await login(201);
    const employeeToken = await login(102);

    const created = await request('/api/approvals', {
      method: 'POST',
      token: opToken,
      body: {
        storeId: 1,
        scheduleBatchId: 10001,
        triggerReasons: ['UNDER_MIN_STAFF'],
        comment: 'needs review',
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.status, 'pending');
    assert.equal(created.json.data.scheduleBatch.status, 'pending_approval');
    const approvalId = created.json.data.id;

    const batch = db.scheduleBatches.find((item) => item.id === 10001);
    assert.equal(batch.status, 'pending_approval');

    const duplicate = await request('/api/approvals', {
      method: 'POST',
      token: opToken,
      body: {
        storeId: 1,
        scheduleBatchId: 10001,
      },
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.json.code, 4002);

    const mismatched = await request('/api/approvals', {
      method: 'POST',
      token: opToken,
      body: {
        storeId: 2,
        scheduleBatchId: 10001,
      },
    });
    assert.equal(mismatched.status, 409);
    assert.equal(mismatched.json.code, 4002);

    const employeeList = await request('/api/approvals', {
      token: employeeToken,
    });
    assert.equal(employeeList.status, 200);
    assert.equal(employeeList.json.data.list.length, 0);

    const employeeDetail = await request(`/api/approvals/${approvalId}`, {
      token: employeeToken,
    });
    assert.equal(employeeDetail.status, 403);
    assert.equal(employeeDetail.json.code, 4004);

    const managerDetail = await request(`/api/approvals/${approvalId}`, {
      token: managerToken,
    });
    assert.equal(managerDetail.status, 200);
    assert.equal(managerDetail.json.data.id, approvalId);

    const approved = await request(`/api/approvals/${approvalId}/approve`, {
      method: 'POST',
      token: opToken,
      body: { comment: 'approved' },
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.json.data.scheduleBatchStatus, 'approved');

    const rejectedAfterApproval = await request(`/api/approvals/${approvalId}/reject`, {
      method: 'POST',
      token: opToken,
      body: { comment: 'too late' },
    });
    assert.equal(rejectedAfterApproval.status, 400);
    assert.equal(rejectedAfterApproval.json.code, 4002);

    console.log('Approval hardening smoke passed');
  } finally {
    db.approvals = originalApprovals;
    db.scheduleBatches = originalBatches;
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
