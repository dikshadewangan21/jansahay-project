const logger = require('../config/logger');
const { randomUUID } = require('crypto'); // built-in, no extra dependency

function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
    logger.info('request', {
      requestId,
      method:    req.method,
      path:      req.path,
      status:    res.statusCode,
      durationMs: Math.round(durationMs),
      ip:        req.ip,
    });
  });

  next();
}

module.exports = { requestLogger };
