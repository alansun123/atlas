const express = require('express');
const healthRouter = require('./routes/health');
const authRouter = require('./modules/auth');
const scheduleRouter = require('./modules/schedule');
const leaveRouter = require('./modules/leave');
const approvalRouter = require('./modules/approval');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Atlas backend is running',
  });
});

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/leave', leaveRouter);
app.use('/api/approval', approvalRouter);

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
  });
});

app.listen(PORT, () => {
  console.log(`Atlas server listening on port ${PORT}`);
});
