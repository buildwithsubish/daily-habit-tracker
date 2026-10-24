import mongoose, { Schema, Document, Model } from 'mongoose';

export type AdminRole = 'super_admin' | 'admin' | 'manager' | 'editor' | 'viewer';

export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  role: AdminRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  twoFactorBackupCodes?: string[];
  allowedIPs?: string[];
  lastLogin?: Date | null;
  lastLoginIP?: string | null;
  loginAttempts: number;
  lockUntil?: Date | null;
  passwordChangedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isLocked(): boolean;
  isIPAllowed(ip: string): boolean;
  needsPasswordReset(): boolean;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'manager', 'editor', 'viewer'],
      default: 'admin',
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    twoFactorBackupCodes: [
      {
        type: String,
      },
    ],
    allowedIPs: [
      {
        type: String,
      },
    ],
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
  },
  {
    timestamps: true,
  }
);

AdminSchema.methods.isLocked = function (): boolean {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

AdminSchema.methods.isIPAllowed = function (ip: string): boolean {
  if (!this.allowedIPs || this.allowedIPs.length === 0) {
    return true;
  }
  return this.allowedIPs.includes(ip);
};

AdminSchema.methods.needsPasswordReset = function (): boolean {
  if (!this.passwordChangedAt) {
    return true;
  }
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return this.passwordChangedAt < ninetyDaysAgo;
};

const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;
