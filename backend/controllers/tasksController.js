const mongoose    = require('mongoose');
const Task        = require('../models/Task');
const Report      = require('../models/Report');
const Volunteer   = require('../models/Volunteer');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../middleware/asyncHandler');
const { urgencyLevel } = require('../services/urgencyScoring');
const { SDG_CATEGORY_MAP } = require('../services/sdgScorer');
const logger = require('../config/logger');

const listTasks = asyncHandler(async (req, res) => {
  const { status, category, assignedVolunteerId, limit = 50, offset = 0 } = req.query;
  const filter = {};
  if (status)   filter.status   = status;
  if (category) filter.category = category;
  if (assignedVolunteerId) {
    filter.assignedVolunteerId = assignedVolunteerId === 'null'
      ? null : new mongoose.Types.ObjectId(assignedVolunteerId);
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort({ urgencyScore: -1, createdAt: -1 })
      .skip(Number(offset)).limit(Number(limit)).lean({ virtuals: true }),
    Task.countDocuments(filter),
  ]);

  res.json({ data: tasks.map(normalise), meta: { total, limit: Number(limit), offset: Number(offset) } });
});

const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).lean({ virtuals: true });
  if (!task) throw new AppError(`Task ${req.params.id} not found`, 404);

  const [report, volunteer] = await Promise.all([
    task.reportId ? Report.findById(task.reportId).lean({ virtuals: true }) : null,
    task.assignedVolunteerId
      ? Volunteer.findById(task.assignedVolunteerId).select('name phone rating').lean({ virtuals: true })
      : null,
  ]);

  res.json({
    ...normalise(task),
    report: report ? normaliseReport(report) : null,
    assignedVolunteer: volunteer
      ? { id: volunteer._id.toString(), name: volunteer.name, phone: volunteer.phone, rating: volunteer.rating }
      : null,
  });
});

const createTask = asyncHandler(async (req, res) => {
  const { reportId, title, description, category, location, estimatedHours } = req.body;
  let urgencyScore = 50;
  const sdgGoals = SDG_CATEGORY_MAP[category] || [];

  if (reportId) {
    const report = await Report.findById(reportId).lean();
    if (!report) throw new AppError(`Linked report ${reportId} not found`, 404);
    urgencyScore = report.urgencyScore;
  }

  const task = await Task.create({
    reportId: reportId || null,
    title: title.trim(), description: description.trim(), category,
    urgencyScore, urgencyLevel: urgencyLevel(urgencyScore), status: 'open',
    assignedVolunteerId: null, estimatedHours: estimatedHours || 2,
    location: { lat: location.lat, lng: location.lng, area: location.area || 'Unknown' },
    sdgGoals,
  });

  logger.info('Task created', { id: task._id, category, urgencyScore });
  res.status(201).json(normalise(task.toJSON()));
});

const assignTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(`Task ${req.params.id} not found`, 404);
  if (task.status === 'completed') throw new AppError('Cannot reassign a completed task.', 400);

  const { volunteerId } = req.body;
  const volunteer = await Volunteer.findById(volunteerId);
  if (!volunteer) throw new AppError(`Volunteer ${volunteerId} not found`, 404);
  if (volunteer.status !== 'available') {
    throw new AppError(`${volunteer.name} is currently ${volunteer.status} and cannot be assigned.`, 409);
  }

  const now = new Date();
  await Promise.all([
    Task.findByIdAndUpdate(task._id, { assignedVolunteerId: volunteer._id, status: 'in-progress', updatedAt: now }),
    Volunteer.findByIdAndUpdate(volunteer._id, { status: 'on-task' }),
    task.reportId
      ? Report.updateOne({ _id: task.reportId, status: 'open' }, { status: 'assigned', updatedAt: now })
      : Promise.resolve(),
  ]);

  const updatedTask = await Task.findById(task._id).lean({ virtuals: true });
  logger.info('Task assigned', { taskId: task._id, volunteerId, volunteerName: volunteer.name });
  res.json({ task: normalise(updatedTask), volunteer: { id: volunteer._id.toString(), name: volunteer.name } });
});

const completeTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(`Task ${req.params.id} not found`, 404);
  if (task.status === 'completed') throw new AppError('Task is already completed.', 400);

  const { notes, photoProof } = req.body;
  const now = new Date();
  const updatePayload = { status: 'completed', completedAt: now, updatedAt: now };
  if (notes)      updatePayload.completionNotes = notes;
  if (photoProof) updatePayload.photoProofUrl   = photoProof;

  await Promise.all([
    Task.findByIdAndUpdate(task._id, updatePayload),
    task.assignedVolunteerId
      ? Volunteer.findByIdAndUpdate(task.assignedVolunteerId, { status: 'available', $inc: { tasksCompleted: 1 } })
      : Promise.resolve(),
    task.reportId
      ? Report.findByIdAndUpdate(task.reportId, { status: 'completed', updatedAt: now })
      : Promise.resolve(),
  ]);

  const updatedTask = await Task.findById(task._id).lean({ virtuals: true });
  logger.info('Task completed', { taskId: task._id });
  res.json(normalise(updatedTask));
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) throw new AppError(`Task ${req.params.id} not found`, 404);
  logger.info('Task deleted', { id: req.params.id });
  res.json({ message: 'Task deleted successfully', id: req.params.id });
});

function normalise(t) {
  const out = { ...t };
  if (!out.id && out._id) out.id = out._id.toString();
  if (out.reportId)            out.reportId            = out.reportId?.toString() ?? null;
  if (out.assignedVolunteerId) out.assignedVolunteerId = out.assignedVolunteerId?.toString() ?? null;
  delete out._id; delete out.__v;
  if (!out.urgencyLevel) out.urgencyLevel = urgencyLevel(out.urgencyScore);
  return out;
}

function normaliseReport(r) {
  const out = { ...r };
  if (!out.id && out._id) out.id = out._id.toString();
  delete out._id; delete out.__v;
  return out;
}

module.exports = { listTasks, getTask, createTask, assignTask, completeTask, deleteTask };
