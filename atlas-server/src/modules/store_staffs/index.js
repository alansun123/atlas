const express = require('express');
const { db, createStoreStaff } = require('../../stores');
const { requireAuth } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  let list = db.storeStaffs;
  if (req.query.storeId) {
    list = list.filter((item) => item.storeId === Number(req.query.storeId));
  }
  if (req.query.userId) {
    list = list.filter((item) => item.userId === Number(req.query.userId));
  }
  if (req.query.status) {
    list = list.filter((item) => item.status === req.query.status);
  }
  return success(res, list);
});

router.post('/', (req, res) => {
  const { storeId, userId, isPrimary = true, status = 'active', joinedAt = new Date().toISOString() } = req.body || {};
  if (!storeId || !userId) return fail(res, 1001, 'storeId 和 userId 为必填字段');

  const relation = createStoreStaff({
    storeId: Number(storeId),
    userId: Number(userId),
    isPrimary: Boolean(isPrimary),
    status,
    joinedAt,
  });
  return success(res, relation, 'created', 201);
});

module.exports = router;
