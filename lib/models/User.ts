import mongoose, { Schema, Model } from 'mongoose';
import { User } from '@/types';

const UserSchema = new Schema<User>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    unique: true,
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

export default mongoose.models.User || mongoose.model<User>('User', UserSchema);

