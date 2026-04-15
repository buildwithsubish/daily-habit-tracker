import mongoose, { Schema } from 'mongoose';

const WhatsAppVerificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  phoneNumberEncrypted: {
    type: String,
    required: true,
  },
  verificationCode: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'expired', 'failed'],
    default: 'pending',
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 3,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  contactName: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

WhatsAppVerificationSchema.index({ userId: 1, status: 1 });
WhatsAppVerificationSchema.index({ phoneNumberEncrypted: 1 });
WhatsAppVerificationSchema.index({ verificationCode: 1, expiresAt: 1 });

export default mongoose.models.WhatsAppVerification || mongoose.model('WhatsAppVerification', WhatsAppVerificationSchema);
