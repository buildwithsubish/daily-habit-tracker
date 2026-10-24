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
    unique: true,
  },
  category: {
    type: String,
    default: 'Fitness',
  },
  structure: {
    type: Schema.Types.Mixed,
    required: true,
  },
});

export default mongoose.models.Preset || mongoose.model<Preset>('Preset', PresetSchema);

