const assert = require('assert');
const { app } = require('./src/app');

async function run() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  async function request(path, { method = 'GET', userId, body } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(userId ? { 'x-mock-user-id': String(userId) } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: res.status,
      json: await res.json(),
    };
  }

  try {
    const employeeCreate = await request('/api/schedules/batches', {
      method: 'POST',
      userId: 102,
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
      userId: 101,
      body: { triggerReasons: ['UNDER_MIN_STAFF'] },
    });
    assert.equal(submitByManager.status, 200);
    const approvalId = submitByManager.json.data.approvalId;
    assert.ok(approvalId);

    const managerApprove = await request(`/api/approvals/${approvalId}/approve`, {
      method: 'POST',
      userId: 101,
      body: { comment: 'try approve' },
    });
    assert.equal(managerApprove.status, 403);

    const employeeMe = await request('/api/schedules/me', {
      method: 'GET',
      userId: 102,
    });
    assert.equal(employeeMe.status, 200);
    assert.equal(employeeMe.json.data.appliedStatus, 'published');
    assert.equal(employeeMe.json.data.list.length, 0);

    const opApprove = await request(`/api/approvals/${approvalId}/approve`, {
      method: 'POST',
      userId: 201,
      body: { comment: 'approved' },
    });
    assert.equal(opApprove.status, 200);
    assert.equal(opApprove.json.data.scheduleBatchStatus, 'approved');

    const publishByManager = await request('/api/schedules/batches/10001/publish', {
      method: 'POST',
      userId: 101,
      body: { notifyEmployees: true },
    });
    assert.equal(publishByManager.status, 200);
    assert.equal(publishByManager.json.data.status, 'published');

    const employeeMePublished = await request('/api/schedules/me', {
      method: 'GET',
      userId: 102,
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
