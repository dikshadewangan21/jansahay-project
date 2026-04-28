const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../config/logger');

function signToken(userId, role) {
  return jwt.sign(
    { id: userId, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn || '7d' },
  );
}

// ── POST /api/auth/register ────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const allowedRoles = ['user', 'volunteer'];
  const assignedRole = allowedRoles.includes(role) ? role : 'user';

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new AppError('An account with this email already exists.', 409);

  const user = await User.create({ name, email, password, phone, role: assignedRole });
  const token = signToken(user._id, user.role);
  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  logger.info('New user registered', { id: user._id, email: user.email, role: user.role });

  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError('Invalid email or password.', 401);

  const token = signToken(user._id, user.role);
  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  logger.info('User logged in', { id: user._id, role: user.role });

  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) throw new AppError('User not found.', 404);

  res.json({
    id: user._id, name: user.name, email: user.email, role: user.role,
    phone: user.phone, votedReports: user.votedReports,
    createdAt: user.createdAt, lastLoginAt: user.lastLoginAt,
  });
});

// ── PATCH /api/auth/me ─────────────────────────────────────────────────────────
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updates = {};
  if (name)  updates.name  = name.trim();
  if (phone) updates.phone = phone.trim();

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

module.exports = { register, login, getMe, updateMe };
