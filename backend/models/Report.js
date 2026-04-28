const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    lat:  { type: Number, required: true },
    lng:  { type: Number, required: true },
    ward: { type: String, default: 'Unknown Ward' },
    area: { type: String, default: 'Unknown Area' },
  },
  { _id: false },
);

// Extended category list — covers both original NGO categories
// and civic-complaint categories (water, electricity, roads, sanitation)
const VALID_CATEGORIES = [
  'water', 'electricity', 'roads', 'sanitation', 'health',
  'food', 'shelter', 'infrastructure', 'air',
];

const reportSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      enum: ['whatsapp', 'paper_survey', 'ngo_upload', 'iot', 'web', 'mobile'],
    },
    category: {
      type: String,
      required: true,
      enum: VALID_CATEGORIES,
    },
    // AI-detected category (may differ from user-selected one)
    aiCategory:   { type: String, enum: [...VALID_CATEGORIES, null], default: null },
    aiConfidence: { type: Number, min: 0, max: 1, default: null },

    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    location:    { type: locationSchema, required: true },
    reportedBy:  { type: String, default: 'Anonymous', maxlength: 100 },

    // Submitter email for notifications (optional)
    submitterEmail: { type: String, default: null },

    // Reference to authenticated user who submitted
    submittedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    urgencyScore:     { type: Number, min: 0, max: 100, default: 50 },
    urgencyBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    urgencyLevel: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'low',
    },

    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'completed', 'rejected'],
      default: 'open',
    },

    tags:          { type: [String], default: [] },
    affectedCount: { type: Number, min: 0, default: 0 },

    // Community Voting — stores user IDs to prevent double-voting
    votes:     { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    voteCount: { type: Number, min: 0, default: 0 },

    // Image Proof Upload
    images: [
      {
        url:        { type: String, required: true },
        filename:   { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // SLA Tracking
    slaDeadline: { type: Date, default: null },
    slaStatus: {
      type: String,
      enum: ['on_time', 'at_risk', 'breached', 'resolved'],
      default: 'on_time',
    },

    // Impact / Feedback after resolution
    resolvedAt:       { type: Date, default: null },
    impactRating:     { type: Number, min: 1, max: 5, default: null },
    impactFeedback:   { type: String, maxlength: 500, default: null },
    markedResolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

reportSchema.index({ status: 1, urgencyScore: -1, createdAt: -1 });
reportSchema.index({ category: 1 });
reportSchema.index({ source: 1 });
reportSchema.index({ voteCount: -1 });
reportSchema.index({ slaStatus: 1 });
reportSchema.index({ submittedByUser: 1 });

module.exports = mongoose.model('Report', reportSchema);
module.exports.VALID_CATEGORIES = VALID_CATEGORIES;
