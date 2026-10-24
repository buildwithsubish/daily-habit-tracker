import mongoose, { Schema, Document, Model } from 'mongoose';
import { AUDIT_CATEGORIES, AuditCategory } from '../audit-log-constants';

export type { AuditCategory };
export { AUDIT_CATEGORIES };

export interface IAuditLog extends Document {
  adminId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  action: string;
  actionType?: string;
  category: AuditCategory;
  targetResourceId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: [...AUDIT_CATEGORIES],
      required: true,
      index: true,
    },
    targetResourceId: {
      type: String,
      default: null,
      index: true,
    },
    details: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'audit_logs',
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });
AuditLogSchema.index({ targetResourceId: 1, createdAt: -1 });

// Enforce strict append-only immutability
AuditLogSchema.pre(
  [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
    'findOneAndReplace',
  ],
  function () {
    throw new Error('Audit logs are append-only and cannot be updated or deleted.');
  }
);

AuditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are append-only and cannot be modified.'));
  }
  // Synchronize actionType with action if actionType was not provided
  if (!this.actionType && this.action) {
    this.actionType = this.action;
  }
  next();
});

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
