const express = require('express');
const { db, createStore, updateStore, getStoreById } = require('../../stores');
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

  const store = createStore({
    code,
    name,
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
  });

  return success(res, store, 'created', 201);
});

router.get('/:id', (req, res) => {
  const store = getStoreById(req.params.id);
  if (!store) return fail(res, 1002, '门店不存在', {}, 404);
  return success(res, store);
});

router.patch('/:id', (req, res) => {
  const store = getStoreById(req.params.id);
  if (!store) return fail(res, 1002, '门店不存在', {}, 404);

  return success(res, updateStore(store.id, req.body || {}));
});

router.delete('/:id', (_req, res) => fail(res, 1003, '当前阶段未支持持久化删除门店', {}, 501));

router.get('/:id/shifts', (req, res) => {
  const list = db.shifts.filter((item) => item.storeId === Number(req.params.id));
  return success(res, list);
});

module.exports = router;
