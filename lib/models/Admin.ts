import mongoose, { Schema, Model } from 'mongoose';

interface Admin {
  email: string;
  passwordHash: string;
  role: 'admin' | 'super_admin';
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  allowedIPs?: string[];
  lastLogin?: Date;
  lastLoginIP?: string;
  loginAttempts: number;
  lockUntil?: Date;
  passwordChangedAt?: Date;
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
  role: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: 'admin',
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    default: null,
  },
  twoFactorBackupCodes: [{
    type: String,
  }],
  allowedIPs: [{
    type: String,
  }],
  lastLogin: {
    type: Date,
    default: null,
  },
  lastLoginIP: {
    type: String,
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
  passwordChangedAt: {
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

// Method to check if account is locked
AdminSchema.methods.isLocked = function(): boolean {
  return this.lockUntil && this.lockUntil > new Date();
};

// Method to check if IP is allowed
AdminSchema.methods.isIPAllowed = function(ip: string): boolean {
  if (!this.allowedIPs || this.allowedIPs.length === 0) {
    return true; // No IP restriction
  }
  return this.allowedIPs.includes(ip);
};

// Method to check if password needs reset (older than 90 days)
AdminSchema.methods.needsPasswordReset = function(): boolean {
  if (!this.passwordChangedAt) {
    return true;
  }
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return this.passwordChangedAt < ninetyDaysAgo;
};

export default mongoose.models.Admin || mongoose.model<Admin>('Admin', AdminSchema);
