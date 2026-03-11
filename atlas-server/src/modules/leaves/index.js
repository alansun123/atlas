const express = require('express');
const { db } = require('../../stores');
const { requireAuth } = require('../../middlewares/auth');
const { success } = require('../../utils/response');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { storeId, employeeId, status = 'approved' } = req.query;
  let list = db.leaves;

  if (storeId) list = list.filter((item) => item.storeId === Number(storeId));
  if (employeeId) list = list.filter((item) => item.employeeId === Number(employeeId));
  if (status) list = list.filter((item) => item.approvalStatus === status);

  return success(res, { list });
});

router.post('/sync/manual', (req, res) => {
  return success(res, {
    taskId: `leave_sync_${Date.now()}`,
    range: req.body || {},
    status: 'accepted',
    mocked: true,
  });
});

router.post('/wework/callback', (req, res) => {
  return success(res, {
    success: true,
    mocked: true,
    payload: req.body || {},
  });
});

module.exports = router;
