const mongoose = require('mongoose');

const sdgImpactSchema = new mongoose.Schema(
  {
    goal:          { type: Number, required: true, unique: true },
    label:         { type: String, required: true },
    score:         { type: Number, min: 0, max: 100, default: 0 },
    trend:         { type: Number, default: 0 },
    tasksLinked:   { type: Number, default: 0 },
    peopleReached: { type: Number, default: 0 },
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

module.exports = mongoose.model('SdgImpact', sdgImpactSchema);
