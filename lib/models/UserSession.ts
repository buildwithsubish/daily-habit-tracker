import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserSession extends Document {
  userId: mongoose.Types.ObjectId;
  tokenFamilyId: string;
  refreshTokenHash: string;
  ipAddress: string;
  userAgent: string;
  deviceName: string;
  isRevoked: boolean;
  revokedReason?: string | null;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenFamilyId: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: 'unknown',
    },
    userAgent: {
      type: String,
      default: 'unknown',
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedReason: {
      type: String,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    collection: 'user_sessions',
    timestamps: true,
  }
);

UserSessionSchema.index({ userId: 1, isRevoked: 1, expiresAt: 1 });
UserSessionSchema.index({ tokenFamilyId: 1, isRevoked: 1 });

const UserSession: Model<IUserSession> =
  mongoose.models.UserSession || mongoose.model<IUserSession>('UserSession', UserSessionSchema);

export default UserSession;
