const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

/**
 * User Model
 * Supports three roles: user | volunteer | admin
 * Passwords are hashed via bcrypt (salt rounds: 12) before save.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // never return password by default
    },
    role: {
      type: String,
      enum: ['user', 'volunteer', 'admin'],
      default: 'user',
    },
    phone: { type: String, trim: true, default: null },
    // For volunteers, link to Volunteer document
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Volunteer',
      default: null,
    },
    // Track which reports this user voted on (prevents double-voting)
    votedReports: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Report',
      default: [],
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password; // never leak password
        return ret;
      },
    },
  },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/**
 * Compare a plain-text password with the stored hash.
 * Must be called on a document fetched with .select('+password').
 */
userSchema.methods.comparePassword = async function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

// email has unique:true in schema definition — no need to re-declare index
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
