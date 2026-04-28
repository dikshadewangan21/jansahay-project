const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Mongoose CastError — e.g. invalid ObjectId in URL param
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(404).json({ error: `Resource not found (invalid ID format: ${err.value})` });
  }

  // Mongoose duplicate key (e.g. unique phone constraint on volunteers)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ error: `Duplicate value for ${field}. This record already exists.` });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({ error: 'Validation failed', details });
  }

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error('Unhandled request error', {
    statusCode,
    message: err.message,
    method: req.method,
    path: req.originalUrl,
    stack: isProd ? undefined : err.stack,
  });

  res.status(statusCode).json({
    error: err.isOperational ? err.message : 'An unexpected server error occurred.',
    code: err.code || null,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

module.exports = { errorHandler, AppError };
