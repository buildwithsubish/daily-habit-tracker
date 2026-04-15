import mongoose, { Schema } from 'mongoose';

const AuditLogSchema = new Schema({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: [
      'whatsapp_session',
      'whatsapp_verification',
      'whatsapp_message',
      'whatsapp_broadcast',
      'user_management',
      'habit_tracking',
      'system',
      'security',
    ],
    required: true,
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
  },
});

AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
