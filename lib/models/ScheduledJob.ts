import mongoose, { Schema } from 'mongoose';

const ScheduledJobSchema = new Schema({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  jobType: {
    type: String,
    enum: ['daily_habit_message', 'reminder', 'weekly_report', 'custom_broadcast', 'inactivity_alert', 'streak_milestone'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  scheduledFor: {
    type: Date,
    required: true,
    index: true,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  targetUsers: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  filterCriteria: {
    activeUsers: { type: Boolean, default: false },
    automationEnabled: { type: Boolean, default: false },
    category: { type: String, default: null },
    engagementLevel: { type: String, default: null },
  },
  messageTemplate: {
    type: String,
    default: null,
  },
  result: {
    totalUsers: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    messagesDelivered: { type: Number, default: 0 },
    messagesFailed: { type: Number, default: 0 },
    errors: { type: String, default: null },
  },
  recurrence: {
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly', 'custom'],
    default: 'once',
  },
  cronExpression: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

ScheduledJobSchema.index({ jobType: 1, status: 1 });
ScheduledJobSchema.index({ scheduledFor: 1, status: 1 });

export default mongoose.models.ScheduledJob || mongoose.model('ScheduledJob', ScheduledJobSchema);
