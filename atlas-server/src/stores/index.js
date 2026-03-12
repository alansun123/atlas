const mockDb = require('../data/mock-db');
const {
  findUserById,
  findAllUsers,
  findStoreById,
  findAllStores,
  findStoreStaffById,
  findStoreStaffsByStoreId,
  findStoreStaffsByUserId,
  createUser,
  updateUser,
  createStore,
  updateStore,
  createStoreStaff,
  updateStoreStaff,
} = require('../data/db');

const db = {
  counters: mockDb.counters,
  shifts: mockDb.shifts,
  leaves: mockDb.leaves,
  scheduleBatches: mockDb.scheduleBatches,
  scheduleEntries: mockDb.scheduleEntries,
  approvals: mockDb.approvals,
  get users() {
    return findAllUsers();
  },
  set users(value) {
    throw new Error(`Direct replacement of db.users is not supported: ${Array.isArray(value) ? 'received array' : typeof value}`);
  },
  get stores() {
    return findAllStores();
  },
  set stores(value) {
    throw new Error(`Direct replacement of db.stores is not supported: ${Array.isArray(value) ? 'received array' : typeof value}`);
  },
  get storeStaffs() {
    return findAllStoreStaffs();
  },
  set storeStaffs(value) {
    throw new Error(`Direct replacement of db.storeStaffs is not supported: ${Array.isArray(value) ? 'received array' : typeof value}`);
  },
};

function nextId(counterKey) {
  db.counters[counterKey] += 1;
  return db.counters[counterKey];
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function findAllStoreStaffs() {
  return db.users.flatMap((user) => findStoreStaffsByUserId(user.id));
}

function getUserById(id) {
  return findUserById(id) || null;
}

function getStoreById(id) {
  return findStoreById(id) || null;
}

function getShiftById(id) {
  return db.shifts.find((item) => item.id === Number(id));
}

function getStoreShifts(storeId) {
  return db.shifts.filter((item) => item.storeId === Number(storeId));
}

function getEntriesByBatchId(batchId) {
  return db.scheduleEntries.filter((item) => item.batchId === Number(batchId));
}

function getApprovalById(id) {
  return db.approvals.find((item) => item.id === Number(id));
}

module.exports = {
  db,
  nextId,
  clone,
  getUserById,
  getStoreById,
  getShiftById,
  getStoreShifts,
  getEntriesByBatchId,
  getApprovalById,
  findAllUsers,
  findAllStores,
  findAllStoreStaffs,
  findStoreStaffById,
  findStoreStaffsByStoreId,
  findStoreStaffsByUserId,
  createUser,
  updateUser,
  createStore,
  updateStore,
  createStoreStaff,
  updateStoreStaff,
};
