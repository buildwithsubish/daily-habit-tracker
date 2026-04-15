import mongoose, { Schema } from 'mongoose';

const WeeklyAnalyticsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  weekStartDate: {
    type: String,
    required: true,
  },
  weekEndDate: {
    type: String,
    required: true,
  },
  totalHabits: {
    type: Number,
    default: 0,
  },
  completedHabits: {
    type: Number,
    default: 0,
  },
  completionRate: {
    type: Number,
    default: 0,
  },
  totalMessagesSent: {
    type: Number,
    default: 0,
  },
  messagesDelivered: {
    type: Number,
    default: 0,
  },
  messagesResponded: {
    type: Number,
    default: 0,
  },
  responseRate: {
    type: Number,
    default: 0,
  },
  remindersSent: {
    type: Number,
    default: 0,
  },
  remindersResponded: {
    type: Number,
    default: 0,
  },
  currentStreakStart: {
    type: String,
    default: null,
  },
  currentStreak: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  previousWeekCompletionRate: {
    type: Number,
    default: 0,
  },
  improvementFromLastWeek: {
    type: Number,
    default: 0,
  },
  topCompletedHabits: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  missedHabits: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  reportSentAt: {
    type: Date,
    default: null,
  },
  reportFormat: {
    type: String,
    enum: ['text', 'image'],
    default: 'text',
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

WeeklyAnalyticsSchema.index({ userId: 1, weekStartDate: 1 }, { unique: true });
WeeklyAnalyticsSchema.index({ weekStartDate: 1 });

export default mongoose.models.WeeklyAnalytics || mongoose.model('WeeklyAnalytics', WeeklyAnalyticsSchema);
