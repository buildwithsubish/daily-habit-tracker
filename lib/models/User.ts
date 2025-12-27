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
  timeZone: {
    type: String,
    default: 'UTC',
  },
  preferredTheme: {
    type: String,
    default: 'classic-light',
    description: 'User\'s preferred theme name'
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

