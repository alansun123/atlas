const express = require('express');
const { db, getStoreById, getUserById, createUser, createStoreStaff } = require('../../stores');
const { requireAuth } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');
const { containsKeyword, paginate, toInt } = require('../../utils/helpers');

const router = express.Router();
router.use(requireAuth);

function toEmployeeView(user) {
  const store = getStoreById(user.primaryStoreId);
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    storeId: user.primaryStoreId,
    storeName: store?.name || null,
    joinedAt: user.joinedAt,
    isNewEmployee: (Date.now() - new Date(user.joinedAt).getTime()) / 86400000 <= 7,
    status: user.status,
  };
}

router.get('/', (req, res) => {
  const storeId = toInt(req.query.storeId);
  const page = toInt(req.query.page) || 1;
  const pageSize = toInt(req.query.pageSize) || 20;

  const list = db.users
    .filter((user) => {
      if (storeId && user.primaryStoreId !== storeId) return false;
      if (req.query.role && user.role !== req.query.role) return false;
      if (req.query.status && user.status !== req.query.status) return false;
      return containsKeyword(`${user.name} ${user.mobile}`, req.query.keyword);
    })
    .map(toEmployeeView);

  return success(res, paginate(list, page, pageSize));
});

router.post('/', (req, res) => {
  const { name, role = 'employee', storeId, mobile = '', joinedAt = new Date().toISOString(), status = 'active' } = req.body || {};
  if (!name || !storeId) return fail(res, 1001, 'name 和 storeId 为必填字段');

  const user = createUser({
    name,
    mobile,
    role,
    status,
    joinedAt,
    permissions: role === 'employee' ? ['schedule:read:self'] : ['store:read', 'employee:read', 'schedule:create'],
    primaryStoreId: Number(storeId),
  });

  createStoreStaff({
    storeId: Number(storeId),
    userId: user.id,
    isPrimary: true,
    status: 'active',
    joinedAt,
  });

  return success(res, toEmployeeView(user), 'created', 201);
});

router.get('/:id', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return fail(res, 1002, '员工不存在', {}, 404);
  return success(res, toEmployeeView(user));
});

module.exports = router;
