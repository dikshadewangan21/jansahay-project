const mongoose = require('mongoose');

const taskLocationSchema = new mongoose.Schema(
  {
    lat:  { type: Number, required: true },
    lng:  { type: Number, required: true },
    area: { type: String, default: 'Unknown' },
  },
  { _id: false },
);

const taskSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      default: null,
    },
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: {
      type: String,
      required: true,
      enum: ['food', 'water', 'health', 'shelter', 'infrastructure', 'air', 'electricity', 'roads', 'sanitation'],
    },
    urgencyScore: { type: Number, min: 0, max: 100, default: 50 },
    urgencyLevel: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'low',
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'completed'],
      default: 'open',
    },
    assignedVolunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Volunteer',
      default: null,
    },
    estimatedHours:  { type: Number, min: 1, max: 48, default: 2 },
    location:        { type: taskLocationSchema, required: true },
    sdgGoals:        { type: [Number], default: [] },
    completedAt:     { type: Date, default: null },
    completionNotes: { type: String, maxlength: 1000, default: null },
    photoProofUrl:   { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        // Expose ObjectId refs as plain strings for the frontend
        if (ret.reportId)            ret.reportId = ret.reportId.toString();
        if (ret.assignedVolunteerId) ret.assignedVolunteerId = ret.assignedVolunteerId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

taskSchema.index({ status: 1, urgencyScore: -1 });
taskSchema.index({ category: 1 });
taskSchema.index({ assignedVolunteerId: 1 });

module.exports = mongoose.model('Task', taskSchema);
