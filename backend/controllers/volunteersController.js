const Volunteer    = require('../models/Volunteer');
const Task         = require('../models/Task');
const { matchVolunteers } = require('../services/volunteerMatcher');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../middleware/asyncHandler');
const logger       = require('../config/logger');

const listVolunteers = asyncHandler(async (req, res) => {
  const { status, skill, availability, limit = 50, offset = 0 } = req.query;
  const filter = {};
  if (status)       filter.status       = status;
  if (availability) filter.availability = availability;
  if (skill)        filter.skills       = skill;

  const [volunteers, total] = await Promise.all([
    Volunteer.find(filter).sort({ rating: -1, tasksCompleted: -1 })
      .skip(Number(offset)).limit(Number(limit)).lean({ virtuals: true }),
    Volunteer.countDocuments(filter),
  ]);

  res.json({ data: volunteers.map(normalise), meta: { total, limit: Number(limit), offset: Number(offset) } });
});

const getVolunteer = asyncHandler(async (req, res) => {
  const vol = await Volunteer.findById(req.params.id).lean({ virtuals: true });
  if (!vol) throw new AppError(`Volunteer ${req.params.id} not found`, 404);
  const taskHistory = await Task.find({ assignedVolunteerId: vol._id }).sort({ updatedAt: -1 }).lean({ virtuals: true });
  res.json({ ...normalise(vol), taskHistory: taskHistory.map(normaliseTask) });
});

const registerVolunteer = asyncHandler(async (req, res) => {
  const { name, phone, email, skills, availability, location } = req.body;
  const existing = await Volunteer.findOne({ phone: phone.trim() }).lean();
  if (existing) throw new AppError('A volunteer with this phone number is already registered.', 409);

  const volunteer = await Volunteer.create({
    name: name.trim(), phone: phone.trim(), email: email?.trim() || null,
    skills: skills || [], availability,
    location: { lat: location.lat, lng: location.lng, ward: location.ward || 'Unknown', area: location.area || 'Unknown' },
    rating: 0, tasksCompleted: 0, status: 'available', joinedAt: new Date(),
  });

  logger.info('Volunteer registered', { id: volunteer._id, name, skills });
  res.status(201).json(normalise(volunteer.toJSON()));
});

const updateVolunteerStatus = asyncHandler(async (req, res) => {
  const allowed = ['available', 'on-task', 'inactive'];
  const { status } = req.body;
  if (!allowed.includes(status)) throw new AppError(`Invalid status. Allowed: ${allowed.join(', ')}`, 400);

  const vol = await Volunteer.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true }).lean({ virtuals: true });
  if (!vol) throw new AppError(`Volunteer ${req.params.id} not found`, 404);
  res.json(normalise(vol));
});

const deleteVolunteer = asyncHandler(async (req, res) => {
  const vol = await Volunteer.findByIdAndDelete(req.params.id);
  if (!vol) throw new AppError(`Volunteer ${req.params.id} not found`, 404);
  logger.info('Volunteer deleted', { id: req.params.id });
  res.json({ message: 'Volunteer deleted successfully', id: req.params.id });
});

const matchForTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId).lean({ virtuals: true });
  if (!task) throw new AppError(`Task ${req.params.taskId} not found`, 404);
  if (task.status === 'completed') throw new AppError('Cannot match volunteers for a completed task.', 400);

  const volunteers = await Volunteer.find({ status: 'available' }).lean({ virtuals: true });
  const matches = matchVolunteers(task, volunteers.map(normalise), 5);

  res.json({
    taskId: task._id.toString(), taskTitle: task.title, category: task.category,
    matches: matches.map((v) => ({
      id: v.id, name: v.name, phone: v.phone, skills: v.skills,
      matchScore: v._matchScore, distanceKm: v._distanceKm, matchedSkills: v._skillMatch,
      rating: v.rating, tasksCompleted: v.tasksCompleted, availability: v.availability, location: v.location,
    })),
    matchCount: matches.length,
  });
});

function normalise(v) {
  const out = { ...v };
  if (!out.id && out._id) out.id = out._id.toString();
  delete out._id; delete out.__v;
  return out;
}

function normaliseTask(t) {
  const out = { ...t };
  if (!out.id && out._id) out.id = out._id.toString();
  if (out.reportId)            out.reportId            = out.reportId.toString();
  if (out.assignedVolunteerId) out.assignedVolunteerId = out.assignedVolunteerId.toString();
  delete out._id; delete out.__v;
  return out;
}

module.exports = { listVolunteers, getVolunteer, registerVolunteer, updateVolunteerStatus, deleteVolunteer, matchForTask };
