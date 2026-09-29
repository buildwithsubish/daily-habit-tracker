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
  value: { type: Number, min: 0 },
  workoutData: { type: Schema.Types.Mixed, default: null },
  customFields: { type: Schema.Types.Mixed, default: null },
  dynamicSteps: [{
    name: { type: String, required: true },
    completed: { type: Boolean, default: false },
  }],
  activityNote: {
    type: String,
    default: null,
  },
  subActivities: [{
    name: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  }],
});

DailyLogSchema.index({ userId: 1, date: 1 });
DailyLogSchema.index({ userId: 1, habitId: 1, date: 1, stepIndex: 1 }, { unique: true });

export default mongoose.models.DailyLog || mongoose.model<DailyLog>('DailyLog', DailyLogSchema);
