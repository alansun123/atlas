const Database = require('better-sqlite3');
const path = require('path');
const mockDb = require('./mock-db');

function resolveDbPath() {
  return process.env.ATLAS_DB_PATH || path.join(__dirname, '../../data/atlas.db');
}

let db = null;

/**
 * Get the database instance (lazy initialization)
 */
function getDb() {
  if (!db) {
    db = new Database(resolveDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Initialize database tables
 */
function initDatabase() {
  const database = getDb();

  // Create users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weworkUserId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT,
      role TEXT NOT NULL DEFAULT 'employee',
      status TEXT NOT NULL DEFAULT 'active',
      joinedAt TEXT,
      permissions TEXT,
      primaryStoreId INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create stores table
  database.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      brandType TEXT NOT NULL DEFAULT 'normal',
      address TEXT,
      managerUserId INTEGER,
      operationManagerUserId INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      staffRule TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (managerUserId) REFERENCES users(id),
      FOREIGN KEY (operationManagerUserId) REFERENCES users(id)
    )
  `);

  // Create store_staffs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS store_staffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      storeId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      isPrimary INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      joinedAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (storeId) REFERENCES stores(id),
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(storeId, userId)
    )
  `);

  // Create indexes for foreign keys
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_weworkUserId ON users(weworkUserId);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_primaryStoreId ON users(primaryStoreId);
    CREATE INDEX IF NOT EXISTS idx_stores_code ON stores(code);
    CREATE INDEX IF NOT EXISTS idx_stores_managerUserId ON stores(managerUserId);
    CREATE INDEX IF NOT EXISTS idx_stores_operationManagerUserId ON stores(operationManagerUserId);
    CREATE INDEX IF NOT EXISTS idx_store_staffs_storeId ON store_staffs(storeId);
    CREATE INDEX IF NOT EXISTS idx_store_staffs_userId ON store_staffs(userId);
  `);

  console.log('Database tables initialized');
  return database;
}

/**
 * Seed initial data from mock-db.js
 * Only seeds if tables are empty
 */
function seedInitialData() {
  const database = getDb();

  // Check if data already exists
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // Seed users
  const insertUser = database.prepare(`
    INSERT INTO users (id, weworkUserId, name, mobile, role, status, joinedAt, permissions, primaryStoreId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertManyUsers = database.transaction((users) => {
    for (const user of users) {
      insertUser.run(
        user.id,
        user.weworkUserId,
        user.name,
        user.mobile,
        user.role,
        user.status,
        user.joinedAt,
        JSON.stringify(user.permissions),
        user.primaryStoreId
      );
    }
  });

  insertManyUsers(mockDb.users);
  console.log(`Seeded ${mockDb.users.length} users`);

  // Seed stores
  const insertStore = database.prepare(`
    INSERT INTO stores (id, code, name, brandType, address, managerUserId, operationManagerUserId, status, staffRule, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertManyStores = database.transaction((stores) => {
    for (const store of stores) {
      insertStore.run(
        store.id,
        store.code,
        store.name,
        store.brandType,
        store.address,
        store.managerUserId,
        store.operationManagerUserId,
        store.status,
        JSON.stringify(store.staffRule),
        store.createdAt,
        store.updatedAt
      );
    }
  });

  insertManyStores(mockDb.stores);
  console.log(`Seeded ${mockDb.stores.length} stores`);

  // Seed store_staffs
  const insertStoreStaff = database.prepare(`
    INSERT INTO store_staffs (id, storeId, userId, isPrimary, status, joinedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertManyStoreStaffs = database.transaction((storeStaffs) => {
    for (const ss of storeStaffs) {
      insertStoreStaff.run(
        ss.id,
        ss.storeId,
        ss.userId,
        ss.isPrimary ? 1 : 0,
        ss.status,
        ss.joinedAt
      );
    }
  });

  insertManyStoreStaffs(mockDb.storeStaffs);
  console.log(`Seeded ${mockDb.storeStaffs.length} store_staffs`);

  console.log('Initial data seeding complete');
}

// ========== Helper Functions (CRUD) ==========

// Users
function findUserById(id) {
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
  return row ? parseUserRow(row) : null;
}

function findUserByWeworkUserId(weworkUserId) {
  const row = getDb().prepare('SELECT * FROM users WHERE weworkUserId = ?').get(weworkUserId);
  return row ? parseUserRow(row) : null;
}

function findAllUsers() {
  const rows = getDb().prepare('SELECT * FROM users').all();
  return rows.map(parseUserRow);
}

function findUsersByStoreId(storeId) {
  const rows = getDb().prepare('SELECT * FROM users WHERE primaryStoreId = ?').all(storeId);
  return rows.map(parseUserRow);
}

function getNextMockWeworkUserId() {
  const rows = getDb().prepare(`
    SELECT id, weworkUserId FROM users
  `).all();

  const maxId = rows.reduce((currentMax, row) => {
    const match = /^mock_(\d+)$/.exec(row.weworkUserId || '');
    if (match) {
      return Math.max(currentMax, Number(match[1]));
    }
    return Math.max(currentMax, Number(row.id) || 0);
  }, Number(mockDb.counters.employeeId) || 0);

  return `mock_${maxId + 1}`;
}

function createUser(user) {
  const result = getDb().prepare(`
    INSERT INTO users (weworkUserId, name, mobile, role, status, joinedAt, permissions, primaryStoreId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.weworkUserId || getNextMockWeworkUserId(),
    user.name,
    user.mobile,
    user.role || 'employee',
    user.status || 'active',
    user.joinedAt,
    JSON.stringify(user.permissions || []),
    user.primaryStoreId
  );
  return findUserById(result.lastInsertRowid);
}

function updateUser(id, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.mobile !== undefined) { fields.push('mobile = ?'); values.push(updates.mobile); }
  if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(updates.permissions)); }
  if (updates.primaryStoreId !== undefined) { fields.push('primaryStoreId = ?'); values.push(updates.primaryStoreId); }

  if (fields.length === 0) return findUserById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findUserById(id);
}

// Stores
function findStoreById(id) {
  const row = getDb().prepare('SELECT * FROM stores WHERE id = ?').get(id);
  return row ? parseStoreRow(row) : null;
}

function findStoreByCode(code) {
  const row = getDb().prepare('SELECT * FROM stores WHERE code = ?').get(code);
  return row ? parseStoreRow(row) : null;
}

function findAllStores() {
  const rows = getDb().prepare('SELECT * FROM stores').all();
  return rows.map(parseStoreRow);
}

function createStore(store) {
  const result = getDb().prepare(`
    INSERT INTO stores (code, name, brandType, address, managerUserId, operationManagerUserId, status, staffRule)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    store.code,
    store.name,
    store.brandType || 'normal',
    store.address,
    store.managerUserId,
    store.operationManagerUserId,
    store.status || 'active',
    JSON.stringify(store.staffRule || {})
  );
  return findStoreById(result.lastInsertRowid);
}

function updateStore(id, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.brandType !== undefined) { fields.push('brandType = ?'); values.push(updates.brandType); }
  if (updates.address !== undefined) { fields.push('address = ?'); values.push(updates.address); }
  if (updates.managerUserId !== undefined) { fields.push('managerUserId = ?'); values.push(updates.managerUserId); }
  if (updates.operationManagerUserId !== undefined) { fields.push('operationManagerUserId = ?'); values.push(updates.operationManagerUserId); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.staffRule !== undefined) { fields.push('staffRule = ?'); values.push(JSON.stringify(updates.staffRule)); }

  if (fields.length === 0) return findStoreById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  getDb().prepare(`UPDATE stores SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findStoreById(id);
}

// Store Staffs
function findStoreStaffById(id) {
  const row = getDb().prepare('SELECT * FROM store_staffs WHERE id = ?').get(id);
  return row ? parseStoreStaffRow(row) : null;
}

function findStoreStaffsByStoreId(storeId) {
  const rows = getDb().prepare('SELECT * FROM store_staffs WHERE storeId = ?').all(storeId);
  return rows.map(parseStoreStaffRow);
}

function findStoreStaffsByUserId(userId) {
  const rows = getDb().prepare('SELECT * FROM store_staffs WHERE userId = ?').all(userId);
  return rows.map(parseStoreStaffRow);
}

function createStoreStaff(storeStaff) {
  const result = getDb().prepare(`
    INSERT INTO store_staffs (storeId, userId, isPrimary, status, joinedAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    storeStaff.storeId,
    storeStaff.userId,
    storeStaff.isPrimary ? 1 : 0,
    storeStaff.status || 'active',
    storeStaff.joinedAt
  );
  return findStoreStaffById(result.lastInsertRowid);
}

function updateStoreStaff(id, updates) {
  const fields = [];
  const values = [];

  if (updates.isPrimary !== undefined) { fields.push('isPrimary = ?'); values.push(updates.isPrimary ? 1 : 0); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }

  if (fields.length === 0) return findStoreStaffById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  getDb().prepare(`UPDATE store_staffs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findStoreStaffById(id);
}

// ========== Row Parsers ==========

function parseUserRow(row) {
  return {
    ...row,
    permissions: row.permissions ? JSON.parse(row.permissions) : [],
  };
}

function parseStoreRow(row) {
  return {
    ...row,
    staffRule: row.staffRule ? JSON.parse(row.staffRule) : {},
  };
}

function parseStoreStaffRow(row) {
  return {
    ...row,
    isPrimary: Boolean(row.isPrimary),
  };
}

// Export all functions
module.exports = {
  getDb,
  closeDb,
  initDatabase,
  seedInitialData,
  getNextMockWeworkUserId,
  // Users
  findUserById,
  findUserByWeworkUserId,
  findAllUsers,
  findUsersByStoreId,
  createUser,
  updateUser,
  // Stores
  findStoreById,
  findStoreByCode,
  findAllStores,
  createStore,
  updateStore,
  // Store Staffs
  findStoreStaffById,
  findStoreStaffsByStoreId,
  findStoreStaffsByUserId,
  createStoreStaff,
  updateStoreStaff,
};
