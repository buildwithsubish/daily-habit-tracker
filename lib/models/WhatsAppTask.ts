import mongoose, { Schema } from 'mongoose';

const WhatsAppTaskSchema = new Schema({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  // e.g. 'send_message', 'create_poll', 'send_weekly_report', 'broadcast_item'
  taskType: {
    type: String,
    required: true,
    index: true,
  },
  // The target end-user (for privacy, only this user's data/habits used)
  // Optional for batch tasks (e.g. 'daily_habit_messages', 'process_all_polls' enqueued from admin manual triggers)
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  },
  // Optional for broadcast etc.
  targetPhone: { type: String, default: '' },
  targetContact: { type: String, default: '' },
  // The data to operate on, e.g. { message, question, options, ... }
  payload: {
    type: Schema.Types.Mixed,
    default: {},
  },
  // date string YYYY-MM-DD for daily grouping / cleanup
  date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0],
    index: true,
  },
  processed: {
    type: Boolean,
    default: false,
    index: true,
  },
  processedAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  result: {
    type: Schema.Types.Mixed,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
  // For ordering: FIFO for one-by-one
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

WhatsAppTaskSchema.index({ processed: 1, createdAt: 1 });
WhatsAppTaskSchema.index({ userId: 1, date: 1, taskType: 1 });
WhatsAppTaskSchema.index({ status: 1, processed: 1 });

export default mongoose.models.WhatsAppTask || mongoose.model('WhatsAppTask', WhatsAppTaskSchema);
