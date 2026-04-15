import mongoose, { Schema } from 'mongoose';

const WhatsAppSessionSchema = new Schema({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: false,
    index: true,
  },
  adminIdString: {
    type: String,
    required: false,
    default: null,
    index: true,
  },
  ADMIN_SESSION_ID: {
    type: String,
    required: false,
    default: null,
    index: true,
  },
  sessionData: {
    type: String,
    default: '',
  },
  sessionPath: {
    type: String,
    required: false,
    default: '',
  },
  qrCode: {
    type: String,
    default: null,
  },
  qrCodeGeneratedAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['disconnected', 'connecting', 'connected', 'failed'],
    default: 'disconnected',
  },
  lastConnectedAt: {
    type: Date,
    default: null,
  },
  lastDisconnectedAt: {
    type: Date,
    default: null,
  },
  phoneNumber: {
    type: String,
    default: null,
  },
  deviceName: {
    type: String,
    default: null,
  },
  failureReason: {
    type: String,
    default: null,
  },
  // Flag to prevent multiple browser instances from opening
  in_use: {
    type: Boolean,
    default: false,
    index: true,
  },
  // Timestamp when in_use was set
  in_use_since: {
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

WhatsAppSessionSchema.index({ adminId: 1, status: 1 });
WhatsAppSessionSchema.index({ createdAt: -1 });

export default mongoose.models.WhatsAppSession || mongoose.model('WhatsAppSession', WhatsAppSessionSchema);

