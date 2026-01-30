export interface User {
  id: string;
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
  userId: string;
  name: string;
  order: number;
  category: 'Health' | 'Productivity' | 'Mindset' | 'Growth' | 'Other' | 'Fitness' | 'Diet' | 'Mindfulness';
  type: 'single-step' | 'multi-step';
  steps: HabitStep[];
  targetPerDay: number;
  schedule: {
    weekdays?: boolean;
    weekends?: boolean;
    custom?: number[]; // 0-6, Sunday-Saturday
  };
  streak: number;
  lastCompletedDate?: string | null;
  createdAt: string;
}

export interface DailyLog {
  id: string;
  userId: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  stepIndex?: number; // for multi-step habits
  completed: boolean;
  completedAt?: string;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  type: string;
  category?: 'Health' | 'Fitness' | 'Productivity' | 'Mindfulness' | 'Growth' | 'Diet' | 'Finance' | 'Social';
  structure: {
    habits: Array<{
      name: string;
      category: Habit['category'];
      type: Habit['type'];
      steps: HabitStep[];
      schedule?: {
        weekdays?: boolean;
        weekends?: boolean;
        custom?: number[];
      };
      time?: string; // HH:MM format
    }>;
  };
}

export interface Streak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
}

export interface MotivationTip {
  id: string;
  date: string;
  message: string;
  type: 'diet' | 'hydration' | 'sleep' | 'exercise' | 'general';
  userId?: string;
}

