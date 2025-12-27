import mongoose, { Schema, Model } from 'mongoose';
import { DailyLog } from '@/types';

const DailyLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  habitId: {
    type: Schema.Types.ObjectId,
    ref: 'Habit',
    required: true,
  },
  date: {
    type: String,
    required: true,
    index: true,
  },
  stepIndex: {
    type: Number,
    default: null,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
});

DailyLogSchema.index({ userId: 1, date: 1 });
DailyLogSchema.index({ userId: 1, habitId: 1, date: 1, stepIndex: 1 }, { unique: true });

export default mongoose.models.DailyLog || mongoose.model<DailyLog>('DailyLog', DailyLogSchema);

