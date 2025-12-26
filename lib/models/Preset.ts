import mongoose, { Schema, Model } from 'mongoose';
import { Preset } from '@/types';

const PresetSchema = new Schema<Preset>({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['weekday', 'sunday', 'gym', 'diet', 'bulking', 'lean-bulk'],
    unique: true,
  },
  structure: {
    type: Schema.Types.Mixed,
    required: true,
  },
});

export default mongoose.models.Preset || mongoose.model<Preset>('Preset', PresetSchema);

