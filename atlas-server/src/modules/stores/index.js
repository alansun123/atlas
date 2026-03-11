const express = require('express');
const { db } = require('../../stores');
const { requireAuth } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');
const { containsKeyword } = require('../../utils/helpers');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { status, keyword } = req.query;
  const list = db.stores.filter((store) => {
    if (status && store.status !== status) return false;
    return containsKeyword(`${store.name} ${store.code}`, keyword);
  });

  return success(res, list);
});

router.post('/', (req, res) => {
  const { name, code, brandType = 'normal', address = '', managerUserId, operationManagerUserId, status = 'active' } = req.body || {};

  if (!name || !code) {
    return fail(res, 1001, 'name 和 code 为必填字段');
  }

  const id = db.counters.storeId += 1;
  const store = {
    id,
    name,
    code,
    brandType,
    address,
    managerUserId: Number(managerUserId) || req.user.id,
    operationManagerUserId: Number(operationManagerUserId) || req.user.id,
    status,
    staffRule: {
      defaultMinStaff: 2,
      defaultMaxStaff: 4,
      newStaffProtectionDays: 7,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.stores.push(store);
  return success(res, store, 'created', 201);
});

router.get('/:id', (req, res) => {
  const store = db.stores.find((item) => item.id === Number(req.params.id));
  if (!store) return fail(res, 1002, '门店不存在', {}, 404);
  return success(res, store);
});

router.patch('/:id', (req, res) => {
  const store = db.stores.find((item) => item.id === Number(req.params.id));
  if (!store) return fail(res, 1002, '门店不存在', {}, 404);

  Object.assign(store, req.body || {}, { updatedAt: new Date().toISOString() });
  return success(res, store);
});

router.delete('/:id', (req, res) => {
  const index = db.stores.findIndex((item) => item.id === Number(req.params.id));
  if (index < 0) return fail(res, 1002, '门店不存在', {}, 404);

  const [removed] = db.stores.splice(index, 1);
  return success(res, removed);
});

router.get('/:id/shifts', (req, res) => {
  const list = db.shifts.filter((item) => item.storeId === Number(req.params.id));
  return success(res, list);
});

module.exports = router;
