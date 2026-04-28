const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const config = require('../config');

/**
 * authenticate — Verifies the JWT from the Authorization header.
 * Attaches decoded user object to req.user.
 * Returns 401 if token missing/invalid, 403 if user inactive.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    // Fetch fresh user to catch deactivated accounts
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'Account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * optionalAuth — Attaches user to req.user if a valid token is present,
 * but does NOT block the request if the token is absent.
 * Useful for endpoints where auth changes the response (e.g. vote state).
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) req.user = user;
  } catch {
    // silently ignore invalid tokens in optional mode
  }
  next();
}

/**
 * requireRole(...roles) — Role guard factory.
 * Must be used AFTER authenticate middleware.
 * Example: router.delete('/:id', authenticate, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
}

module.exports = { authenticate, optionalAuth, requireRole };
