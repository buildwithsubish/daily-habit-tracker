import mongoose, { Schema, Model } from 'mongoose';
import { Habit } from '@/types';

const HabitStepSchema = new Schema({
  order: { type: Number, required: true },
  name: { type: String, required: true },
  duration: { type: Number },
});

const HabitSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  descriptionEnabled: {
    type: Boolean,
    default: false,
  },
  dynamicChecklist: {
    type: Boolean,
    default: false,
  },
  checklistPrompt: {
    type: String,
    default: '',
  },
  whatsappEnabled: {
    type: Boolean,
    default: false,
  },
  activityLoggingEnabled: {
    type: Boolean,
    default: false,
  },
  advancedMode: {
    type: Boolean,
    default: false,
  },
  subActivities: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'reps', 'duration', 'kg'], default: 'text' },
  }],
  whatsappContact: {
    type: String,
    default: '',
    trim: true,
  },
  whatsappFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'manual', 'smart'],
    default: 'manual',
  },
  whatsappTime: {
    type: String,
    default: '08:00',
  },
  order: {
    type: Number,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Health', 'Productivity', 'Mindfulness', 'Fitness', 'Diet', 'Growth', 'Finance', 'Social', 'Other'],
  },
  type: {
    type: String,
    required: true,
    enum: ['single-step', 'multi-step'],
  },
  steps: {
    type: [HabitStepSchema],
    required: true,
  },
  targetPerDay: {
    type: Number,
    default: 1,
  },
  schedule: {
    weekdays: { type: Boolean, default: true },
    weekends: { type: Boolean, default: true },
    custom: { type: [Number] },
  },
  streak: {
    type: Number,
    default: 0,
  },
  inactiveAlertDays: {
    type: Number,
    default: 3,
  },
  reminderEnabled: {
    type: Boolean,
    default: false,
  },
  reminderTime: {
    type: String,
    default: '08:00',
  },
  reminderInterval: {
    type: Number,
    default: 5,
  },
  maxReminders: {
    type: Number,
    default: 3,
  },
  reminderMessages: {
    type: [String],
    default: [
      "Hey! Don't forget to complete {habit} today! 💪",
      "Quick reminder: {habit} is waiting for you! 🎯",
      "One last push! Complete {habit} now! 🚀",
      "Time to shine! {habit} is ready for you! ⭐",
      "Don't break the streak! Complete {habit} now! 🔥",
      "Your future self will thank you for doing {habit}! 🌟",
      "Small step, big difference! Complete {habit}! 🚀",
      "One more done! Mark {habit} as complete! ✅",
    ],
  },
  sendRemainder: {
    type: Boolean,
    default: false,
  },
  lastReminderSent: {
    type: Date,
    default: null,
  },
  nextReminderScheduled: {
    type: Date,
    default: null,
  },
  reminderResponseCount: {
    type: Number,
    default: 0,
  },
  lastResponseReceived: {
    type: Date,
    default: null,
  },
  lastCompletedDate: {
    type: String, // YYYY-MM-DD
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

HabitSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Habit || mongoose.model<Habit>('Habit', HabitSchema);
