const express = require('express');
const { db, getApprovalById, getStoreById, getUserById } = require('../../stores');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');
const { paginate, toInt } = require('../../utils/helpers');

const router = express.Router();
router.use(requireAuth);

function now() {
  return new Date().toISOString();
}

function getBatchById(id) {
  return db.scheduleBatches.find((item) => item.id === Number(id)) || null;
}

function approvalView(item) {
  const batch = getBatchById(item.scheduleBatchId);
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

function canAccessApproval(user, approval) {
  if (!user || !approval) return false;
  if (user.role === 'operation_manager') return true;

  const store = getStoreById(approval.storeId);
  return approval.submittedBy === user.id || approval.currentApproverId === user.id || store?.managerUserId === user.id;
}

function requireApprovalReadAccess(req, res, approval) {
  if (canAccessApproval(req.user, approval)) {
    return null;
  }

  return fail(res, 4004, '无权查看该审批单', {
    approvalId: approval.id,
    operatorUserId: req.user.id,
  }, 403);
}

function requireAssignedApprover(req, res, approval) {
  if (approval.currentApproverId !== req.user.id) {
    return fail(res, 4003, '仅当前审批人可执行该操作', {
      currentApproverId: approval.currentApproverId,
      operatorUserId: req.user.id,
    }, 403);
  }
  return null;
}

function validateApprovalRequestPayload(storeId, scheduleBatchId) {
  const store = getStoreById(storeId);
  if (!store) {
    return { ok: false, status: 404, code: 1002, message: '门店不存在' };
  }

  const batch = getBatchById(scheduleBatchId);
  if (!batch) {
    return { ok: false, status: 404, code: 1002, message: '排班批次不存在' };
  }

  if (batch.storeId !== Number(storeId)) {
    return {
      ok: false,
      status: 409,
      code: 4002,
      message: '审批单门店与排班批次不匹配',
      data: {
        storeId: Number(storeId),
        batchStoreId: batch.storeId,
        scheduleBatchId: batch.id,
      },
    };
  }

  if (batch.status === 'published') {
    return {
      ok: false,
      status: 409,
      code: 4002,
      message: '已发布排班不能创建审批单',
      data: { scheduleBatchId: batch.id, batchStatus: batch.status },
    };
  }

  return { ok: true, store, batch };
}

function syncBatchToPendingApproval(batch, operatorUserId) {
  batch.status = 'pending_approval';
  batch.submittedBy = batch.submittedBy || operatorUserId;
  batch.submittedAt = batch.submittedAt || now();
  batch.updatedAt = now();
}

router.post('/', requirePermission('approval:action', '无权限创建审批单'), (req, res) => {
  const { type = 'schedule_exception', storeId, scheduleBatchId, triggerReasons = [], comment = '' } = req.body || {};
  if (!storeId || !scheduleBatchId) return fail(res, 1001, 'storeId 和 scheduleBatchId 为必填字段');

  const validation = validateApprovalRequestPayload(storeId, scheduleBatchId);
  if (!validation.ok) {
    return fail(res, validation.code, validation.message, validation.data || {}, validation.status);
  }

  const { store, batch } = validation;
  const existingPending = db.approvals.find((item) => item.scheduleBatchId === batch.id && item.status === 'pending');
  if (existingPending) {
    return fail(res, 4002, '当前排班已有待审批记录', {
      approvalId: existingPending.id,
      scheduleBatchId: batch.id,
    }, 409);
  }

  const approval = {
    id: db.counters.approvalId += 1,
    requestNo: `APR-${Date.now()}`,
    type,
    storeId: Number(storeId),
    scheduleBatchId: Number(scheduleBatchId),
    submittedBy: req.user.id,
    currentApproverId: store.operationManagerUserId || req.user.id,
    status: 'pending',
    triggerReasons,
    comment,
    createdAt: now(),
    updatedAt: now(),
  };

  db.approvals.push(approval);
  syncBatchToPendingApproval(batch, req.user.id);
  return success(res, approvalView(approval), 'created', 201);
});

router.get('/', (req, res) => {
  const page = toInt(req.query.page) || 1;
  const pageSize = toInt(req.query.pageSize) || 20;
  let list = db.approvals.filter((item) => canAccessApproval(req.user, item));
  if (req.query.storeId) list = list.filter((item) => item.storeId === Number(req.query.storeId));
  if (req.query.status) list = list.filter((item) => item.status === req.query.status);
  return success(res, paginate(list.map(approvalView), page, pageSize));
});

router.get('/pending', (req, res) => {
  const page = toInt(req.query.page) || 1;
  const pageSize = toInt(req.query.pageSize) || 20;
  const list = db.approvals
    .filter((item) => item.status === 'pending')
    .filter((item) => canAccessApproval(req.user, item));
  return success(res, paginate(list.map(approvalView), page, pageSize));
});

router.get('/:id', (req, res) => {
  const approval = getApprovalById(req.params.id);
  if (!approval) return fail(res, 4001, '审批单不存在', {}, 404);
  const accessError = requireApprovalReadAccess(req, res, approval);
  if (accessError) return accessError;
  return success(res, approvalView(approval));
});

router.post('/:id/approve', requirePermission('approval:action', '无权限审批'), (req, res) => {
  const approval = getApprovalById(req.params.id);
  if (!approval) return fail(res, 4001, '审批单不存在', {}, 404);
  if (approval.status !== 'pending') return fail(res, 4002, '当前审批单不可审批');
  const assignedError = requireAssignedApprover(req, res, approval);
  if (assignedError) return assignedError;

  const batch = getBatchById(approval.scheduleBatchId);
  if (batch && batch.status !== 'pending_approval') {
    return fail(res, 4002, '排班批次状态异常，无法审批', {
      scheduleBatchId: batch.id,
      batchStatus: batch.status,
      expectedStatus: 'pending_approval',
    }, 409);
  }

  approval.status = 'approved';
  approval.comment = req.body?.comment || approval.comment;
  approval.approvedAt = now();
  approval.updatedAt = approval.approvedAt;

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

router.post('/:id/reject', requirePermission('approval:action', '无权限驳回审批'), (req, res) => {
  const approval = getApprovalById(req.params.id);
  if (!approval) return fail(res, 4001, '审批单不存在', {}, 404);
  if (approval.status !== 'pending') return fail(res, 4002, '当前审批单不可驳回');
  const assignedError = requireAssignedApprover(req, res, approval);
  if (assignedError) return assignedError;

  const batch = getBatchById(approval.scheduleBatchId);
  if (batch && batch.status !== 'pending_approval') {
    return fail(res, 4002, '排班批次状态异常，无法驳回', {
      scheduleBatchId: batch.id,
      batchStatus: batch.status,
      expectedStatus: 'pending_approval',
    }, 409);
  }

  approval.status = 'rejected';
  approval.comment = req.body?.comment || approval.comment;
  approval.rejectedAt = now();
  approval.updatedAt = approval.rejectedAt;

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
