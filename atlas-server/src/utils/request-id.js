const crypto = require('crypto');

function generateRequestId() {
  const randomPart = crypto.randomBytes(4).toString('hex');
  return `trace_${Date.now()}_${randomPart}`;
}

function assignRequestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const requestId = (typeof incoming === 'string' && incoming.trim()) ? incoming.trim() : generateRequestId();
  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

module.exports = {
  assignRequestId,
  generateRequestId,
};
