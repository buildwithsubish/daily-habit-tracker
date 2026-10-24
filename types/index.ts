export interface User {
  id: string;
  email: string;
  username?: string;
  passwordHash: string;
  timeZone: string;
  whatsappNumber?: string;
  whatsappVerified?: boolean;
  whatsappVerificationCode?: string;
  whatsappVerificationExpiry?: string;
  whatsappAutomation: boolean;
  whatsappSendTime?: string;
  whatsappFrequency?: 'daily' | 'weekly';
  whatsappReminderCount?: number;
  whatsappReminderInterval?: number;
  pollSchedule?: {
    enabled: boolean;
    time: string;
    frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
    customDays: number[];
  };
  weeklyReportSchedule?: {
    enabled: boolean;
    day: number;
    time: string;
  };
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
    quietHours: { start: string; end: string };
  };
  reminderEnabled?: boolean;
  reminderTime?: string;
  weight?: number;
  lastWeightUpdate?: string | null;
  weightHistory?: WeightEntry[];
  celebratedAchievements: string[];
  createdAt: string;
}

export interface WeightEntry {
  weight: number;
  date: string; // 'YYYY-MM-DD'
  loggedAt?: string;
  note?: string;
}


export interface HabitStep {
  id?: number;
  order: number;
  name: string;
  duration?: number; // in minutes
  completed?: boolean;
}

export interface SubActivity {
  name: string;
  type: 'text' | 'number' | 'reps' | 'duration' | 'kg';
  value?: string | number;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  order: number;
  category: 'Health' | 'Fitness' | 'Productivity' | 'Mindfulness' | 'Growth' | 'Diet' | 'Finance' | 'Social' | 'Other' | 'Workout';
  type: 'single-step' | 'multi-step' | 'measurable' | 'timer' | 'advanced';
  steps: HabitStep[];
  targetPerDay: number;
  unit?: string; // e.g., "mins", "cups", "reps"
  targetValue?: number; // for measurable habits
  description?: string;
  descriptionEnabled?: boolean;
  dynamicChecklist?: boolean;
  checklistPrompt?: string;
  whatsappEnabled?: boolean;
  whatsappContact?: string;
  whatsappFrequency?: 'daily' | 'weekly' | 'manual' | 'smart';
  whatsappTime?: string;
  activityLoggingEnabled?: boolean;
  advancedMode?: boolean; 
  subActivities?: SubActivity[];
  schedule: {
    weekdays?: boolean;
    weekends?: boolean;
    custom?: number[]; 
  };
  hidden?: boolean;
  inactiveAlertDays?: number;
  active?: boolean;
  streak: number;
  lastCompletedDate?: string | null;
  reminderEnabled?: boolean;
  reminderTime?: string;
  reminderInterval?: number;
  maxReminders?: number;
  reminderMessages?: string[];
  sendRemainder?: boolean;
  lastReminderSent?: string;
  nextReminderScheduled?: string;
  reminderResponseCount?: number;
  lastResponseReceived?: string;
  createdAt: string;
}

export interface ExerciseSet {
  reps?: number;
  weight?: number; // in kg
  duration?: number; // in seconds
  completed: boolean;
}

export interface ExerciseEntry {
  name: string;
  sets: ExerciseSet[];
  notes?: string;
}

export interface WorkoutData {
  exercises: ExerciseEntry[];
  caloriesBurned?: number;
  totalDuration?: number; // in minutes
  intensity: 'low' | 'medium' | 'high';
  goal?: 'weight-loss' | 'maintain' | 'weight-gain';
}

export interface DynamicStep {
  name: string;
  completed: boolean;
}

export interface DailyLog {
  id: string;
  userId: string;
  habitId: string;
  date: string; 
  stepIndex?: number; 
  value?: number; // for measurable habits (e.g., 500 for ml)
  completed: boolean;
  completedAt?: string;
  dynamicSteps?: DynamicStep[];
  subActivities?: SubActivity[];
  workoutData?: WorkoutData;
  customFields?: Record<string, string | number | boolean>;
  activityNote?: string; 
}

export interface UserPreferences {
  advancedMode: boolean;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  calorieGoal?: number;
  weightGoalType?: 'weight-loss' | 'maintain' | 'weight-gain';
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  type: string;
  category?: 'Health' | 'Fitness' | 'Productivity' | 'Mindfulness' | 'Growth' | 'Diet' | 'Finance' | 'Social' | 'Other';
  structure: {
    habits: Array<{
      name: string;
      category: Habit['category'];
      type: Habit['type'];
      steps: HabitStep[];
      description?: string;
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

export type AchievementTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Legendary';
export type AchievementCategory = 'Streak' | 'Completion' | 'Time-Based' | 'Diversity' | 'Consistency' | 'Milestone & Special' | 'Fitness & Gym';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  points: number;
  achieved: boolean;
  celebrated?: boolean;
  category: AchievementCategory;

  hidden?: boolean;
  unlockedAt?: string;
  progress?: number; // 0 to 100
  currentValue?: number;
  targetValue?: number;
}
