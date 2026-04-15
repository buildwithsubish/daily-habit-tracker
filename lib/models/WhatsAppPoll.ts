import mongoose, { Schema } from 'mongoose';

export interface IWhatsAppPoll extends Document {
  userId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  contactName: string;
  question: string;
  options: Array<{
    text: string;
    votes: number;
    voters: string[];
  }>;
  totalVotes: number;
  allowMultiple: boolean;
  status: 'pending' | 'sent' | 'voted' | 'completed' | 'failed';
  messageId?: string;
  sentAt?: Date;
  votedAt?: Date;
  completedAt?: Date;
  results?: {
    completionRate: number;
    completedHabits: number;
    totalHabits: number;
  };
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppPollSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  contactName: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
    default: 'What are the completed daily tasks?',
  },
  options: [{
    text: { type: String, required: true },
    votes: { type: Number, default: 0 },
    voters: [{ type: String }],
  }],
  totalVotes: {
    type: Number,
    default: 0,
  },
  allowMultiple: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'voted', 'completed', 'failed'],
    default: 'pending',
  },
  messageId: {
    type: String,
    default: '',
  },
  sentAt: {
    type: Date,
    default: null,
  },
  votedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  results: {
    completionRate: { type: Number, default: 0 },
    completedHabits: { type: Number, default: 0 },
    totalHabits: { type: Number, default: 0 },
  },
  date: {
    type: String,
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

WhatsAppPollSchema.index({ userId: 1, date: 1, status: 1 });
WhatsAppPollSchema.index({ adminId: 1, createdAt: -1 });

export default mongoose.models.WhatsAppPoll || mongoose.model<IWhatsAppPoll>('WhatsAppPoll', WhatsAppPollSchema);
