/**
 * Notification Model
 * Stores in-app notifications for users (volunteers).
 * Created when a new report is submitted and volunteers are matched.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // The User (_id) who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        'new_report_match',   // volunteer matched to a new report
        'report_status',      // a report's status changed
        'task_assigned',      // volunteer assigned to a task
        'system',             // generic platform message
      ],
      default: 'system',
    },

    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },

    // Optional reference to the related report / task
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      default: null,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },

    // Extra metadata (e.g. urgency level, category)
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },

    isRead: { type: Boolean, default: false, index: true },
    readAt:  { type: Date, default: null },
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
  },
);

// Compound index for fast unread-count queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
