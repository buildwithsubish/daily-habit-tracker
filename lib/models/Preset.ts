import mongoose, { Schema, Model } from 'mongoose';
import { Preset } from '@/types';

const PresetSchema = new Schema<Preset>({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    required: true,
    enum: [
      'morning-routine',
      'daily-exercise',
      'better-sleep',
      'productivity',
      'mindfulness',
      'healthy-eating',
      'learning',
      'financial',
      'social',
      'weekend-reset'
    ],
    unique: true,
  },
  category: {
    type: String,
    enum: ['Health', 'Fitness', 'Productivity', 'Mindfulness', 'Growth', 'Diet', 'Finance', 'Social'],
    default: 'Health',
  },
  structure: {
    type: Schema.Types.Mixed,
    required: true,
  },
});

export default mongoose.models.Preset || mongoose.model<Preset>('Preset', PresetSchema);

