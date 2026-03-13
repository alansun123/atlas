function createMeta(res) {
  return {
    requestId: res?.locals?.requestId || `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
}

function success(res, data = {}, message = 'ok', status = 200) {
  return res.status(status).json({
    code: 0,
    message,
    data,
    ...createMeta(res),
  });
}

function fail(res, code, message, data = {}, status = 400) {
  return res.status(status).json({
    code,
    message,
    data,
    ...createMeta(res),
  });
}

module.exports = {
  success,
  fail,
};
