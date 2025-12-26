export interface User {
  id: number;
  email: string;
  username?: string;
  passwordHash: string;
  timeZone: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
    quietHours: { start: string; end: string };
  };
  createdAt: string;
}

export interface HabitStep {
  id?: number;
  order: number;
  name: string;
  duration?: number; // in minutes
  completed?: boolean;
}

export interface Habit {
  id: string;
  userId: number;
  name: string;
  order: number;
  category: 'Health' | 'Productivity' | 'Mindfulness' | 'Fitness' | 'Diet';
  type: 'single-step' | 'multi-step';
  steps: HabitStep[];
  targetPerDay: number;
  schedule: {
    weekdays?: boolean;
    weekends?: boolean;
    custom?: number[]; // 0-6, Sunday-Saturday
  };
  createdAt: string;
}

export interface DailyLog {
  id: string;
  userId: number;
  habitId: string;
  date: string; // YYYY-MM-DD
  stepIndex?: number; // for multi-step habits
  completed: boolean;
  completedAt?: string;
}

export interface Preset {
  id: string;
  name: string;
  type: 'weekday' | 'sunday' | 'gym' | 'diet' | 'bulking' | 'lean-bulk';
  structure: {
    habits: Array<{
      name: string;
      category: Habit['category'];
      type: Habit['type'];
      steps: HabitStep[];
      time?: string; // HH:MM format
    }>;
  };
}

export interface Streak {
  habitId: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
}

export interface MotivationTip {
  id: number;
  date: string;
  message: string;
  type: 'diet' | 'hydration' | 'sleep' | 'exercise' | 'general';
  userId?: number;
}

