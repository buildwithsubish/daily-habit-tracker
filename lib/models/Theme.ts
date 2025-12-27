import mongoose, { Schema, Model } from 'mongoose';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface Theme {
  name: string;
  displayName: string;
  description: string;
  category: 'light' | 'dark' | 'colorful' | 'minimal' | 'nature' | 'vibrant';
  isDefault: boolean;
  isCustom: boolean;
  colors: ThemeColors;
  backgroundImage?: string; // URL to background image
  accentImage?: string; // URL to accent/decorative image
  fonts: {
    heading: string;
    body: string;
  };
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
    full: string;
  };
  animations: {
    duration: string;
    easing: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ThemeColorsSchema = new Schema<ThemeColors>({
  primary: { type: String, required: true },
  secondary: { type: String, required: true },
  accent: { type: String, required: true },
  background: { type: String, required: true },
  surface: { type: String, required: true },
  text: { type: String, required: true },
  textSecondary: { type: String, required: true },
  border: { type: String, required: true },
  success: { type: String, required: true },
  warning: { type: String, required: true },
  error: { type: String, required: true },
  info: { type: String, required: true },
});

const ThemeSchema = new Schema<Theme>({
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
    enum: ['light', 'dark', 'colorful', 'minimal', 'nature', 'vibrant'],
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  colors: {
    type: ThemeColorsSchema,
    required: true,
  },
  backgroundImage: {
    type: String,
    default: null,
    description: 'URL to background image for theme'
  },
  accentImage: {
    type: String,
    default: null,
    description: 'URL to accent image for theme'
  },
  fonts: {
    heading: { type: String, default: 'system-ui' },
    body: { type: String, default: 'system-ui' },
  },
  shadows: {
    small: { type: String, default: '0 1px 3px rgba(0,0,0,0.12)' },
    medium: { type: String, default: '0 4px 6px rgba(0,0,0,0.1)' },
    large: { type: String, default: '0 10px 25px rgba(0,0,0,0.15)' },
  },
  borderRadius: {
    small: { type: String, default: '0.375rem' },
    medium: { type: String, default: '0.5rem' },
    large: { type: String, default: '0.75rem' },
    full: { type: String, default: '9999px' },
  },
  animations: {
    duration: { type: String, default: '0.3s' },
    easing: { type: String, default: 'cubic-bezier(0.4, 0, 0.2, 1)' },
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

export default mongoose.models.Theme || mongoose.model<Theme>('Theme', ThemeSchema);
