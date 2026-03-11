const db = require('../data/mock-db');

function nextId(counterKey) {
  db.counters[counterKey] += 1;
  return db.counters[counterKey];
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function getUserById(id) {
  return db.users.find((item) => item.id === Number(id));
}

function getStoreById(id) {
  return db.stores.find((item) => item.id === Number(id));
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
};
