function maskWeworkUserId(weworkUserId) {
  if (!weworkUserId) return null;
  const raw = String(weworkUserId);
  if (raw.length <= 4) return raw;
  return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
}

function logAuthEvent(req, event, details = {}) {
  const payload = {
    type: 'auth-event',
    event,
    requestId: req.requestId || null,
    method: req.method,
    path: req.originalUrl || req.url,
    ...details,
  };

  if (payload.weworkUserId) {
    payload.weworkUserId = maskWeworkUserId(payload.weworkUserId);
  }

  console.info(`[auth-event] ${JSON.stringify(payload)}`);
}

module.exports = {
  logAuthEvent,
  maskWeworkUserId,
};
