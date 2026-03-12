const express = require('express');
const healthRouter = require('./routes/health');
const authRouter = require('./modules/auth');
const storesRouter = require('./modules/stores');
const employeesRouter = require('./modules/employees');
const storeStaffsRouter = require('./modules/store_staffs');
const schedulesRouter = require('./modules/schedules');
const leavesRouter = require('./modules/leaves');
const approvalsRouter = require('./modules/approvals');
const { attachUser } = require('./middlewares/auth');
const { fail, success } = require('./utils/response');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(attachUser);

app.get('/', (req, res) => {
  return success(res, {
    service: 'atlas-server',
    version: 'mock-mvp',
    currentUser: req.user || null,
    routes: [
      '/health',
      '/api/auth/mock-login',
      '/api/auth/me',
      '/api/auth/logout',
      '/api/stores',
      '/api/stores/:id/shifts',
      '/api/employees',
      '/api/schedules/batches',
      '/api/schedules/batches/:id',
      '/api/schedules/batches/:id/validate',
      '/api/schedules/batches/:id/submit-approval',
      '/api/schedules/batches/:id/publish',
      '/api/schedules/me',
      '/api/approvals/pending',
      '/api/approvals/:id',
      '/api/approvals/:id/approve',
      '/api/approvals/:id/reject',
    ],
  }, 'Atlas backend mock API is running');
});

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/stores', storesRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/store_staffs', storeStaffsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/approvals', approvalsRouter);

app.use((req, res) => fail(res, 1002, 'Route not found', { path: req.originalUrl }, 404));

app.listen(PORT, () => {
  console.log(`Atlas server listening on port ${PORT}`);
});
