import mongoose, { Schema, Model } from 'mongoose';
import { Habit } from '@/types';

const HabitStepSchema = new Schema({
  order: { type: Number, required: true },
  name: { type: String, required: true },
  duration: { type: Number },
});

const HabitSchema = new Schema<Habit>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    required: true,
    enum: ['Health', 'Productivity', 'Mindfulness', 'Fitness', 'Diet'],
  },
  type: {
    type: String,
    required: true,
    enum: ['single-step', 'multi-step'],
  },
  steps: {
    type: [HabitStepSchema],
    required: true,
  },
  targetPerDay: {
    type: Number,
    default: 1,
  },
  schedule: {
    weekdays: { type: Boolean, default: true },
    weekends: { type: Boolean, default: true },
    custom: { type: [Number] },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

HabitSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Habit || mongoose.model<Habit>('Habit', HabitSchema);

