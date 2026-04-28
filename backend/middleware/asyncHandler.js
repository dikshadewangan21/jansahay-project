/**
 * asyncHandler — wraps async route handlers so thrown errors
 * are forwarded to Express's central error handler.
 * This is the core fix for "Invalid server response" errors.
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
