import mongoose, { Schema, Model } from 'mongoose';

interface Admin {
  email: string;
  passwordHash: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<Admin>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  resetToken: {
    type: String,
    default: null,
  },
  resetTokenExpiry: {
    type: Date,
    default: null,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create unique index on email
AdminSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.Admin || mongoose.model<Admin>('Admin', AdminSchema);

