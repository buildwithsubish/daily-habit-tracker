import mongoose, { Schema, Model } from 'mongoose';
import { User } from '@/types';

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  timeZone: {
    type: String,
    default: 'UTC',
  },
  whatsappNumber: {
    type: String,
    default: '',
    trim: true,
  },
  whatsappNumberEncrypted: {
    type: String,
    default: '',
    trim: true,
  },
  whatsappNumberHash: {
    type: String,
    default: '',
    index: true,
  },
  whatsappVerified: {
    type: Boolean,
    default: false,
  },
  whatsappContactName: {
    type: String,
    default: '',
    trim: true,
  },
  whatsappVerificationCode: {
    type: String,
    default: '',
  },
  whatsappVerificationExpiry: {
    type: Date,
    default: null,
  },
  whatsappAutomation: {
    type: Boolean,
    default: true, // Changed to true - always run by default
  },
  whatsappSendTime: {
    type: String,
    default: '20:00',
  },
  whatsappFrequency: {
    type: String,
    enum: ['daily', 'weekly'],
    default: 'daily',
  },
  whatsappReminderCount: {
    type: Number,
    default: 3, // Enable reminders by default
    min: 0,
    max: 5,
  },
  whatsappReminderInterval: {
    type: Number,
    default: 10, // minutes
    min: 5,
    max: 60,
  },
  pollSchedule: {
    enabled: { type: Boolean, default: true },
    time: { type: String, default: '20:00' },
    frequency: { type: String, enum: ['daily', 'weekdays', 'weekends', 'custom'], default: 'daily' },
    customDays: { type: [Number], default: [] },
    reminderEnabled: { type: Boolean, default: true },
    reminderIntervals: { type: [Number], default: [5, 10, 20, 30] },
  },
  weeklyReportSchedule: {
    enabled: { type: Boolean, default: true },
    day: { type: Number, default: 0 }, // 0 = Sunday
    time: { type: String, default: '09:00' },
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    quietHours: {
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });

export default mongoose.models.User || mongoose.model<User>('User', UserSchema);

