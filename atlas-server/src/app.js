const express = require('express');
const { initDatabase, seedInitialData } = require('./data/db');
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
const { assignRequestId } = require('./utils/request-id');

function createApp() {
  initDatabase();
  seedInitialData();

  const app = express();

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-mock-user-id');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  });
  app.use(express.json());
  app.use(assignRequestId);
  app.use(attachUser);

  app.get('/', (req, res) => {
    return success(res, {
      service: 'atlas-server',
      version: 'mock-mvp-auth-signed',
      currentUser: req.user || null,
      routes: [
        '/health',
        '/api/auth/mock-login',
        '/api/auth/wework/url',
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

  return app;
}

const app = createApp();

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Atlas server listening on port ${PORT}`);
  });
}

module.exports = {
  app,
  createApp,
};
