const express = require('express');
const { db, getStoreById, getShiftById, getUserById, getEntriesByBatchId, getApprovalById } = require('../../stores');
const { requireAuth } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');
const { toInt } = require('../../utils/helpers');

const router = express.Router();
router.use(requireAuth);

function now() {
  return new Date().toISOString();
}

function getBatchById(id) {
  return db.scheduleBatches.find((item) => item.id === Number(id));
}

function buildEntry(input, { batchId, storeId, createdBy, status = 'draft', source = 'manual' }) {
  return {
    id: db.counters.scheduleEntryId += 1,
    batchId,
    storeId: Number(storeId),
    userId: Number(input.employeeId),
    shiftId: Number(input.shiftId),
    scheduleDate: input.scheduleDate,
    status,
    source,
    remark: input.remark || '',
    createdBy,
    createdAt: now(),
    updatedAt: now(),
  };
}

function normalizeEntries(entries = []) {
  return entries.flatMap((item) => {
    const employeeIds = Array.isArray(item.employeeIds)
      ? item.employeeIds
      : [item.employeeId].filter(Boolean);

    return employeeIds.map((employeeId) => ({
      employeeId,
      shiftId: item.shiftId,
      scheduleDate: item.scheduleDate,
      remark: item.remark || '',
    }));
  });
}

function entryView(entry) {
  const shift = getShiftById(entry.shiftId);
  const user = getUserById(entry.userId);
  return {
    id: entry.id,
    scheduleDate: entry.scheduleDate,
    shiftId: entry.shiftId,
    shiftName: shift?.name || null,
    startTime: shift?.startTime || null,
    endTime: shift?.endTime || null,
    employees: user ? [{ id: user.id, name: user.name }] : [],
    employeeId: entry.userId,
    employeeName: user?.name || null,
    remark: entry.remark,
    status: entry.status,
  };
}

function buildBatchDetail(batch) {
  const approval = db.approvals.find((item) => item.scheduleBatchId === batch.id && item.status === 'pending')
    || db.approvals.find((item) => item.scheduleBatchId === batch.id)
    || null;

  return {
    ...batch,
    store: getStoreById(batch.storeId),
    approval: approval ? {
      id: approval.id,
      requestNo: approval.requestNo,
      status: approval.status,
      currentApproverId: approval.currentApproverId,
    } : null,
    entries: getEntriesByBatchId(batch.id).map(entryView),
  };
}

function validateBatch(batchId) {
  const batch = getBatchById(batchId);
  if (!batch) return null;

  const entries = getEntriesByBatchId(batch.id);
  const issues = [];

  const grouped = new Map();
  entries.forEach((entry) => {
    const key = `${entry.scheduleDate}|${entry.shiftId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  });

  grouped.forEach((groupEntries, key) => {
    const [, shiftIdText] = key.split('|');
    const shiftId = Number(shiftIdText);
    const shift = getShiftById(shiftId);
    if (!shift) return;

    if (groupEntries.length < shift.minStaff) {
      issues.push({
        type: 'UNDER_MIN_STAFF',
        level: 'warning',
        scheduleDate: groupEntries[0].scheduleDate,
        shiftId,
        message: `${shift.name}排班人数低于最小值 ${shift.minStaff}`,
      });
    }

    if (groupEntries.length > shift.maxStaff) {
      issues.push({
        type: 'OVER_MAX_STAFF',
        level: 'warning',
        scheduleDate: groupEntries[0].scheduleDate,
        shiftId,
        message: `${shift.name}排班人数高于最大值 ${shift.maxStaff}`,
      });
    }
  });

  const duplicateKeyMap = new Map();

  entries.forEach((entry) => {
    const dupKey = `${entry.userId}|${entry.scheduleDate}`;
    duplicateKeyMap.set(dupKey, (duplicateKeyMap.get(dupKey) || 0) + 1);

    const leave = db.leaves.find((item) => item.employeeId === entry.userId && item.startTime.slice(0, 10) <= entry.scheduleDate && item.endTime.slice(0, 10) >= entry.scheduleDate);
    if (leave) {
      issues.push({
        type: 'LEAVE_CONFLICT',
        level: 'warning',
        scheduleDate: entry.scheduleDate,
        employeeId: entry.userId,
        message: `${leave.employeeName} 在 ${entry.scheduleDate} 有请假记录`,
      });
    }

    const user = getUserById(entry.userId);
    if (user && (Date.parse(entry.scheduleDate) - Date.parse(user.joinedAt)) / 86400000 <= 7) {
      issues.push({
        type: 'NEW_EMPLOYEE_FIRST_WEEK',
        level: 'warning',
        scheduleDate: entry.scheduleDate,
        employeeId: entry.userId,
        message: `员工${user.name}处于入职首周`,
      });
    }
  });

  duplicateKeyMap.forEach((count, key) => {
    if (count <= 1) return;
    const [employeeIdText, scheduleDate] = key.split('|');
    const employeeId = Number(employeeIdText);
    const user = getUserById(employeeId);
    issues.push({
      type: 'DUPLICATED_ASSIGNMENT',
      level: 'error',
      scheduleDate,
      employeeId,
      message: `${user?.name || `员工${employeeId}`} 在 ${scheduleDate} 被重复排班`,
    });
  });

  batch.validationStatus = issues.some((item) => item.level === 'error') ? 'failed' : (issues.length ? 'warning' : 'passed');
  batch.requiresApproval = issues.some((item) => ['UNDER_MIN_STAFF', 'OVER_MAX_STAFF', 'LEAVE_CONFLICT', 'NEW_EMPLOYEE_FIRST_WEEK'].includes(item.type));
  batch.updatedAt = now();

  return {
    passed: issues.every((item) => item.level !== 'error'),
    validationStatus: batch.validationStatus,
    requiresApproval: batch.requiresApproval,
    issues,
  };
}

router.get('/', (_req, res) => success(res, db.scheduleBatches.map(buildBatchDetail)));

router.post('/batches', (req, res) => {
  const { storeId, weekStartDate, weekEndDate, entries = [], remark = '' } = req.body || {};
  if (!storeId || !weekStartDate || !weekEndDate) {
    return fail(res, 1001, 'storeId、weekStartDate、weekEndDate 为必填字段');
  }

  const batchId = db.counters.scheduleBatchId += 1;
  const batch = {
    id: batchId,
    storeId: Number(storeId),
    weekStartDate,
    weekEndDate,
    status: 'draft',
    validationStatus: 'not_checked',
    requiresApproval: false,
    createdBy: req.user.id,
    submittedBy: null,
    submittedAt: null,
    publishedBy: null,
    publishedAt: null,
    remark,
    createdAt: now(),
    updatedAt: now(),
  };
  db.scheduleBatches.push(batch);

  normalizeEntries(entries).forEach((item) => {
    db.scheduleEntries.push(buildEntry(item, {
      batchId,
      storeId,
      createdBy: req.user.id,
    }));
  });

  return success(res, buildBatchDetail(batch), 'created', 201);
});

router.patch('/batches/:id', (req, res) => {
  const batch = getBatchById(req.params.id);
  if (!batch) return fail(res, 1002, '排班批次不存在', {}, 404);

  const { entries, ...rest } = req.body || {};
  Object.assign(batch, rest, { updatedAt: now() });
  if (Array.isArray(entries)) {
    db.scheduleEntries = db.scheduleEntries.filter((item) => item.batchId !== batch.id);
    normalizeEntries(entries).forEach((item) => {
      db.scheduleEntries.push(buildEntry(item, {
        batchId: batch.id,
        storeId: batch.storeId,
        createdBy: req.user.id,
        status: batch.status,
        source: 'adjusted',
      }));
    });
  }

  return success(res, buildBatchDetail(batch));
});

router.get('/batches/:id', (req, res) => {
  const batch = getBatchById(req.params.id);
  if (!batch) return fail(res, 1002, '排班批次不存在', {}, 404);
  return success(res, buildBatchDetail(batch));
});

router.post('/batches/:id/validate', (req, res) => {
  const result = validateBatch(req.params.id);
  if (!result) return fail(res, 1002, '排班批次不存在', {}, 404);
  return success(res, result);
});

router.post('/batches/:id/submit-approval', (req, res) => {
  const batch = getBatchById(req.params.id);
  if (!batch) return fail(res, 1002, '排班批次不存在', {}, 404);

  if (batch.status === 'published') {
    return fail(res, 1003, '已发布批次不能再次提审');
  }

  const existingPendingApproval = db.approvals.find((item) => item.scheduleBatchId === batch.id && item.status === 'pending');
  if (existingPendingApproval) {
    return success(res, {
      batchId: batch.id,
      approvalId: existingPendingApproval.id,
      status: batch.status,
      reused: true,
    });
  }

  const store = getStoreById(batch.storeId);
  const approval = {
    id: db.counters.approvalId += 1,
    requestNo: `APR-${Date.now()}`,
    type: 'schedule_exception',
    storeId: batch.storeId,
    scheduleBatchId: batch.id,
    submittedBy: req.user.id,
    currentApproverId: store?.operationManagerUserId || req.user.id,
    status: 'pending',
    triggerReasons: req.body?.triggerReasons || [],
    comment: req.body?.comment || '',
    createdAt: now(),
    updatedAt: now(),
  };

  db.approvals.push(approval);
  batch.status = 'pending_approval';
  batch.submittedBy = req.user.id;
  batch.submittedAt = now();
  batch.updatedAt = batch.submittedAt;

  return success(res, {
    batchId: batch.id,
    approvalId: approval.id,
    status: batch.status,
    currentApproverId: approval.currentApproverId,
  });
});

router.post('/batches/:id/publish', (req, res) => {
  const batch = getBatchById(req.params.id);
  if (!batch) return fail(res, 1002, '排班批次不存在', {}, 404);

  if (batch.requiresApproval && !['approved', 'published'].includes(batch.status)) {
    return fail(res, 1003, '当前批次需审批后才能发布');
  }

  batch.status = 'published';
  batch.publishedBy = req.user.id;
  batch.publishedAt = now();
  batch.updatedAt = batch.publishedAt;

  db.scheduleEntries.forEach((entry) => {
    if (entry.batchId === batch.id) {
      entry.status = 'published';
      entry.updatedAt = batch.publishedAt;
    }
  });

  return success(res, {
    batchId: batch.id,
    status: batch.status,
    publishedAt: batch.publishedAt,
    notifyEmployees: Boolean(req.body?.notifyEmployees),
  });
});

router.get('/calendar', (req, res) => {
  const storeId = toInt(req.query.storeId);
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const entries = db.scheduleEntries.filter((entry) => {
    if (storeId && entry.storeId !== storeId) return false;
    if (startDate && entry.scheduleDate < startDate) return false;
    if (endDate && entry.scheduleDate > endDate) return false;
    if (req.query.status && entry.status !== req.query.status) return false;
    return true;
  });

  const daysMap = new Map();
  entries.forEach((entry) => {
    if (!daysMap.has(entry.scheduleDate)) daysMap.set(entry.scheduleDate, []);
    daysMap.get(entry.scheduleDate).push(entry);
  });

  const days = Array.from(daysMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEntries]) => ({
      date,
      shifts: dayEntries.map((entry) => ({
        shiftId: entry.shiftId,
        shiftName: getShiftById(entry.shiftId)?.name || null,
        employees: [getUserById(entry.userId)].filter(Boolean).map((user) => ({ id: user.id, name: user.name })),
        status: entry.status,
      })),
    }));

  return success(res, { storeId, range: { startDate, endDate }, days });
});

router.get('/me', (req, res) => {
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const list = db.scheduleEntries
    .filter((entry) => entry.userId === req.user.id)
    .filter((entry) => (!startDate || entry.scheduleDate >= startDate) && (!endDate || entry.scheduleDate <= endDate))
    .map((entry) => {
      const store = getStoreById(entry.storeId);
      const shift = getShiftById(entry.shiftId);
      return {
        scheduleId: entry.id,
        batchId: entry.batchId,
        date: entry.scheduleDate,
        storeId: entry.storeId,
        storeName: store?.name || null,
        shiftId: entry.shiftId,
        shiftName: shift?.name || null,
        startTime: shift?.startTime || null,
        endTime: shift?.endTime || null,
        status: entry.status,
      };
    });

  return success(res, { userId: req.user.id, list });
});

router.post('/batches/:id/duplicate', (req, res) => {
  const source = getBatchById(req.params.id);
  if (!source) return fail(res, 1002, '排班批次不存在', {}, 404);

  const batchId = db.counters.scheduleBatchId += 1;
  const duplicate = {
    ...source,
    id: batchId,
    status: 'draft',
    validationStatus: 'not_checked',
    requiresApproval: false,
    createdBy: req.user.id,
    submittedBy: null,
    submittedAt: null,
    publishedBy: null,
    publishedAt: null,
    createdAt: now(),
    updatedAt: now(),
  };
  db.scheduleBatches.push(duplicate);

  getEntriesByBatchId(source.id).forEach((entry) => {
    db.scheduleEntries.push({
      ...entry,
      id: db.counters.scheduleEntryId += 1,
      batchId,
      status: 'draft',
      source: 'copied',
      createdBy: req.user.id,
      createdAt: now(),
      updatedAt: now(),
    });
  });

  return success(res, { batchId, sourceBatchId: source.id, status: duplicate.status });
});

module.exports = router;
