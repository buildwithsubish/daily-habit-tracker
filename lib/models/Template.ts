import mongoose, { Schema, Model } from 'mongoose';

interface TemplateSection {
  id: string;
  type: 'header' | 'stats' | 'chart' | 'list' | 'form' | 'footer';
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
}

interface Template {
  name: string;
  displayName: string;
  description: string;
  category: 'dashboard' | 'analytics' | 'mobile' | 'admin';
  layout: {
    sections: TemplateSection[];
    spacing: string;
    containerWidth: string;
  };
  components: Record<string, any>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<Template>({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ['dashboard', 'analytics', 'mobile', 'admin'],
    required: true,
  },
  layout: {
    sections: [{
      id: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['header', 'stats', 'chart', 'list', 'form', 'footer'],
        required: true 
      },
      position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
      size: {
        width: { type: Number, default: 1 },
        height: { type: Number, default: 1 },
      },
      config: { type: Schema.Types.Mixed, default: {} },
    }],
    spacing: { type: String, default: '1rem' },
    containerWidth: { type: String, default: '100%' },
  },
  components: {
    type: Schema.Types.Mixed,
    default: {},
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Template || mongoose.model<Template>('Template', TemplateSchema);
