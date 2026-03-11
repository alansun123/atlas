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
const { fail } = require('./utils/response');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(attachUser);

app.get('/', (req, res) => {
  res.json({
    message: 'Atlas backend is running',
    version: 'mock-mvp',
    routes: [
      '/health',
      '/api/auth',
      '/api/stores',
      '/api/employees',
      '/api/store_staffs',
      '/api/schedules',
      '/api/leaves',
      '/api/approvals',
    ],
  });
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
