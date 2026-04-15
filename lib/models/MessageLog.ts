import mongoose, { Schema } from 'mongoose';

const MessageLogSchema = new Schema({
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
    type: {
        type: String,
        enum: ['summary', 'reminder', 'poll', 'appreciation', 'escalation', 'scheduled'],
        required: true,
    },
    status: {
        type: String,
        enum: ['scheduled', 'sent', 'delivered', 'responded', 'failed'],
        default: 'sent',
    },
    content: {
        type: String,
        required: true,
    },
    sentAt: {
        type: Date,
        default: Date.now,
    },
    scheduledFor: {
        type: Date,
        default: null,
    },
    respondedAt: {
        type: Date,
        default: null,
    },
    reminderCount: {
        type: Number,
        default: 0,
    },
    escalatedToAdmin: {
        type: Boolean,
        default: false,
    },
    messageId: {
        type: String,
        default: '',
    },
    error: {
        type: String,
        default: '',
    },
    retryCount: {
        type: Number,
        default: 0,
    },
    maxRetries: {
        type: Number,
        default: 3,
    },
    date: {
        type: String, // YYYY-MM-DD for easy querying
        required: true,
        index: true,
    },
});

MessageLogSchema.index({ userId: 1, date: 1, type: 1 });
MessageLogSchema.index({ status: 1, date: 1 });
MessageLogSchema.index({ status: 1, scheduledFor: 1 });
MessageLogSchema.index({ userId: 1, status: 1 });

export default mongoose.models.MessageLog || mongoose.model('MessageLog', MessageLogSchema);

