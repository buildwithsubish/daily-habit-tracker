import mongoose, { Schema } from 'mongoose';

const ReminderLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  habitId: {
    type: Schema.Types.ObjectId,
    ref: 'Habit',
    default: null,
  },
  messageLogId: {
    type: Schema.Types.ObjectId,
    ref: 'MessageLog',
    default: null,
  },
  reminderNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'ignored'],
    default: 'pending',
  },
  sentAt: {
    type: Date,
    default: null,
  },
  deliveredAt: {
    type: Date,
    default: null,
  },
  responseReceived: {
    type: Boolean,
    default: false,
  },
  responseContent: {
    type: String,
    default: null,
  },
  responseParsed: {
    type: Schema.Types.Mixed,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
  date: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ReminderLogSchema.index({ userId: 1, date: 1, reminderNumber: 1 });
ReminderLogSchema.index({ messageLogId: 1 });
ReminderLogSchema.index({ status: 1, date: 1 });

export default mongoose.models.ReminderLog || mongoose.model('ReminderLog', ReminderLogSchema);
