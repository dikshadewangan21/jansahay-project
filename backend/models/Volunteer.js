const mongoose = require('mongoose');

const volunteerLocationSchema = new mongoose.Schema(
  {
    lat:  { type: Number, required: true },
    lng:  { type: Number, required: true },
    ward: { type: String, default: 'Unknown' },
    area: { type: String, default: 'Unknown' },
  },
  { _id: false },
);

const VALID_SKILLS = [
  'medical', 'first-aid', 'counseling', 'elderly-care', 'medicine-distribution',
  'logistics', 'food-distribution', 'coordination', 'driving',
  'plumbing', 'water-sanitation', 'construction', 'heavy-lifting', 'shelter-setup',
  'field-survey', 'documentation',
  'translation-hindi', 'translation-bengali', 'translation-odia',
  'education', 'child-welfare', 'woman-child-welfare',
];

const volunteerSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, unique: true },
    email: { type: String, trim: true, lowercase: true, default: null },
    skills: {
      type: [String],
      validate: {
        validator: (arr) => arr.length > 0 && arr.every((s) => VALID_SKILLS.includes(s)),
        message: 'skills must be non-empty and contain only valid skill values',
      },
    },
    availability: {
      type: String,
      required: true,
      enum: ['daily', 'weekdays', 'weekends'],
    },
    location:       { type: volunteerLocationSchema, required: true },
    rating:         { type: Number, min: 0, max: 5, default: 0 },
    tasksCompleted: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['available', 'on-task', 'inactive'],
      default: 'available',
    },
    joinedAt: { type: Date, default: Date.now },
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

volunteerSchema.index({ status: 1 });
volunteerSchema.index({ availability: 1 });

module.exports = mongoose.model('Volunteer', volunteerSchema);
