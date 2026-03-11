const express = require('express');
const { db, getStoreById, getStoreShifts, getShiftById, getUserById, getEntriesByBatchId } = require('../../stores');
const { requireAuth } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');
const { toInt } = require('../../utils/helpers');

const router = express.Router();
router.use(requireAuth);

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
    remark: entry.remark,
    status: entry.status,
  };
}

function buildBatchDetail(batch) {
  return {
    ...batch,
    store: getStoreById(batch.storeId),
    entries: getEntriesByBatchId(batch.id).map(entryView),
  };
}

function validateBatch(batchId) {
  const batch = db.scheduleBatches.find((item) => item.id === Number(batchId));
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

  entries.forEach((entry) => {
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

  batch.validationStatus = issues.length ? 'warning' : 'passed';
  batch.requiresApproval = issues.some((item) => ['UNDER_MIN_STAFF', 'OVER_MAX_STAFF', 'LEAVE_CONFLICT', 'NEW_EMPLOYEE_FIRST_WEEK'].includes(item.type));
  batch.updatedAt = new Date().toISOString();

  return {
    passed: issues.length === 0,
    requiresApproval: batch.requiresApproval,
    issues,
  };
}

router.get('/', (_req, res) => {
  return success(res, db.scheduleBatches.map(buildBatchDetail));
});

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.scheduleBatches.push(batch);

  entries.forEach((item) => {
    (item.employeeIds || []).forEach((employeeId) => {
      db.scheduleEntries.push({
        id: db.counters.scheduleEntryId += 1,
        batchId,
        storeId: Number(storeId),
        userId: Number(employeeId),
        shiftId: Number(item.shiftId),
        scheduleDate: item.scheduleDate,
        status: 'draft',
        source: 'manual',
        remark: item.remark || '',
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  });

  return success(res, { batchId, status: batch.status }, 'created', 201);
});

router.patch('/batches/:id', (req, res) => {
  const batch = db.scheduleBatches.find((item) => item.id === Number(req.params.id));
  if (!batch) return fail(res, 1002, '排班批次不存在', {}, 404);

  const { entries, ...rest } = req.body || {};
  Object.assign(batch, rest, { updatedAt: new Date().toISOString() });
  if (Array.isArray(entries)) {
    db.scheduleEntries = db.scheduleEntries.filter((item) => item.batchId !== batch.id);
    entries.forEach((item) => {
      (item.employeeIds || []).forEach((employeeId) => {
        db.scheduleEntries.push({
          id: db.counters.scheduleEntryId += 1,
          batchId: batch.id,
          storeId: batch.storeId,
          userId: Number(employeeId),
          shiftId: Number(item.shiftId),
          scheduleDate: item.scheduleDate,
          status: batch.status,
          source: 'adjusted',
          remark: item.remark || '',
          createdBy: req.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    });
  }

  return success(res, { batchId: batch.id, status: batch.status, updated: true });
});

router.get('/batches/:id', (req, res) => {
  const batch = db.scheduleBatches.find((item) => item.id === Number(req.params.id));
  if (!batch) return fail(res, 1002, '排班批次不存在', {}, 404);
  return success(res, buildBatchDetail(batch));
});

router.post('/batches/:id/validate', (req, res) => {
  const result = validateBatch(req.params.id);
  if (!result) return fail(res, 1002, '排班批次不存在', {}, 404);
  return success(res, result);
});

router.post('/batches/:id/submit-approval', (req, res) => {
  const batch = db.scheduleBatches.find((item) => item.id === Number(req.params.id));
  if (!batch) return fail(res, 1002, '排班批次不存在', {}, 404);

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.approvals.push(approval);
  batch.status = 'pending_approval';
  batch.submittedBy = req.user.id;
  batch.submittedAt = new Date().toISOString();
  batch.updatedAt = batch.submittedAt;

  return success(res, { batchId: batch.id, approvalId: approval.id, status: batch.status });
});

router.post('/batches/:id/publish', (req, res) => {
  const batch = db.scheduleBatches.find((item) => item.id === Number(req.params.id));
  if (!batch) return fail(res, 1002, '排班批次不存在', {}, 404);

  if (batch.requiresApproval && !['approved', 'published'].includes(batch.status)) {
    return fail(res, 1003, '当前批次需审批后才能发布');
  }

  batch.status = 'published';
  batch.publishedBy = req.user.id;
  batch.publishedAt = new Date().toISOString();
  batch.updatedAt = batch.publishedAt;

  db.scheduleEntries.forEach((entry) => {
    if (entry.batchId === batch.id) {
      entry.status = 'published';
      entry.updatedAt = batch.publishedAt;
    }
  });

  return success(res, { batchId: batch.id, status: batch.status, publishedAt: batch.publishedAt, notifyEmployees: Boolean(req.body?.notifyEmployees) });
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

  const days = Array.from(daysMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayEntries]) => ({
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
  const source = db.scheduleBatches.find((item) => item.id === Number(req.params.id));
  if (!source) return fail(res, 1002, '排班批次不存在', {}, 404);

  const batchId = db.counters.scheduleBatchId += 1;
  const duplicate = {
    ...source,
    id: batchId,
    status: 'draft',
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  return success(res, { batchId, sourceBatchId: source.id, status: duplicate.status });
});

module.exports = router;
