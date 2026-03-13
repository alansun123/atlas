const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-persistence-'));
const dbPath = path.join(tempDir, 'atlas.db');
process.env.ATLAS_DB_PATH = dbPath;

function loadDbModule() {
  const modulePath = require.resolve('./src/data/db');
  delete require.cache[modulePath];
  return require('./src/data/db');
}

function createEmployee(dbModule, name, mobile) {
  const user = dbModule.createUser({
    name,
    mobile,
    role: 'employee',
    status: 'active',
    joinedAt: new Date().toISOString(),
    permissions: ['schedule:read:self'],
    primaryStoreId: 1,
  });

  dbModule.createStoreStaff({
    storeId: 1,
    userId: user.id,
    isPrimary: true,
    status: 'active',
    joinedAt: user.joinedAt,
  });

  return user;
}

try {
  let dbModule = loadDbModule();
  dbModule.initDatabase();
  dbModule.seedInitialData();

  const firstUser = createEmployee(dbModule, '持久化回归员工A', '13900000001');
  assert.equal(firstUser.weworkUserId, 'mock_206');
  dbModule.closeDb();

  dbModule = loadDbModule();
  dbModule.initDatabase();
  dbModule.seedInitialData();

  const secondUser = createEmployee(dbModule, '持久化回归员工B', '13900000002');
  assert.equal(secondUser.weworkUserId, 'mock_207');

  const persistedUsers = dbModule.findAllUsers().filter((user) => user.weworkUserId.startsWith('mock_'));
  assert.ok(persistedUsers.some((user) => user.weworkUserId === 'mock_206'));
  assert.ok(persistedUsers.some((user) => user.weworkUserId === 'mock_207'));

  dbModule.closeDb();
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('persistence smoke ok');
} catch (error) {
  try {
    const dbModule = loadDbModule();
    if (typeof dbModule.closeDb === 'function') dbModule.closeDb();
  } catch (_closeError) {
    // ignore cleanup errors
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
  throw error;
}
