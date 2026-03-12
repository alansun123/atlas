const express = require('express');
const { db, getApprovalById, getStoreById, getUserById } = require('../../stores');
const { requireAuth } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');
const { paginate, toInt } = require('../../utils/helpers');

const router = express.Router();
router.use(requireAuth);

function now() {
  return new Date().toISOString();
}

function approvalView(item) {
  const batch = db.scheduleBatches.find((scheduleBatch) => scheduleBatch.id === item.scheduleBatchId) || null;
  return {
    ...item,
    storeName: getStoreById(item.storeId)?.name || null,
    submittedByUser: getUserById(item.submittedBy) || null,
    currentApprover: getUserById(item.currentApproverId) || null,
    scheduleBatch: batch ? {
      id: batch.id,
      status: batch.status,
      weekStartDate: batch.weekStartDate,
      weekEndDate: batch.weekEndDate,
      validationStatus: batch.validationStatus,
      requiresApproval: batch.requiresApproval,
    } : null,
  };
}

router.post('/', (req, res) => {
  const { type = 'schedule_exception', storeId, scheduleBatchId, triggerReasons = [], comment = '' } = req.body || {};
  if (!storeId || !scheduleBatchId) return fail(res, 1001, 'storeId 和 scheduleBatchId 为必填字段');

  const store = getStoreById(storeId);
  const approval = {
    id: db.counters.approvalId += 1,
    requestNo: `APR-${Date.now()}`,
    type,
    storeId: Number(storeId),
    scheduleBatchId: Number(scheduleBatchId),
    submittedBy: req.user.id,
    currentApproverId: store?.operationManagerUserId || req.user.id,
    status: 'pending',
    triggerReasons,
    comment,
    createdAt: now(),
    updatedAt: now(),
  };

  db.approvals.push(approval);
  return success(res, approvalView(approval), 'created', 201);
});

router.get('/', (req, res) => {
  const page = toInt(req.query.page) || 1;
  const pageSize = toInt(req.query.pageSize) || 20;
  let list = db.approvals;
  if (req.query.storeId) list = list.filter((item) => item.storeId === Number(req.query.storeId));
  if (req.query.status) list = list.filter((item) => item.status === req.query.status);
  return success(res, paginate(list.map(approvalView), page, pageSize));
});

router.get('/pending', (req, res) => {
  const page = toInt(req.query.page) || 1;
  const pageSize = toInt(req.query.pageSize) || 20;
  const list = db.approvals.filter((item) => item.status === 'pending');
  return success(res, paginate(list.map(approvalView), page, pageSize));
});

router.get('/:id', (req, res) => {
  const approval = getApprovalById(req.params.id);
  if (!approval) return fail(res, 4001, '审批单不存在', {}, 404);
  return success(res, approvalView(approval));
});

router.post('/:id/approve', (req, res) => {
  const approval = getApprovalById(req.params.id);
  if (!approval) return fail(res, 4001, '审批单不存在', {}, 404);
  if (approval.status !== 'pending') return fail(res, 4002, '当前审批单不可审批');

  approval.status = 'approved';
  approval.comment = req.body?.comment || approval.comment;
  approval.approvedAt = now();
  approval.updatedAt = approval.approvedAt;
  approval.currentApproverId = req.user.id;

  const batch = db.scheduleBatches.find((item) => item.id === approval.scheduleBatchId);
  if (batch) {
    batch.status = 'approved';
    batch.updatedAt = approval.approvedAt;
  }

  return success(res, {
    id: approval.id,
    status: approval.status,
    approvedAt: approval.approvedAt,
    scheduleBatchId: approval.scheduleBatchId,
    scheduleBatchStatus: batch?.status || null,
  });
});

router.post('/:id/reject', (req, res) => {
  const approval = getApprovalById(req.params.id);
  if (!approval) return fail(res, 4001, '审批单不存在', {}, 404);
  if (approval.status !== 'pending') return fail(res, 4002, '当前审批单不可驳回');

  approval.status = 'rejected';
  approval.comment = req.body?.comment || approval.comment;
  approval.rejectedAt = now();
  approval.updatedAt = approval.rejectedAt;
  approval.currentApproverId = req.user.id;

  const batch = db.scheduleBatches.find((item) => item.id === approval.scheduleBatchId);
  if (batch) {
    batch.status = 'rejected';
    batch.updatedAt = approval.rejectedAt;
  }

  return success(res, {
    id: approval.id,
    status: approval.status,
    rejectedAt: approval.rejectedAt,
    scheduleBatchId: approval.scheduleBatchId,
    scheduleBatchStatus: batch?.status || null,
  });
});

module.exports = router;
