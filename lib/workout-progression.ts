/**
 * Workout Progression & Progressive Overload Engine
 * 
 * Rules:
 * 1. Streak Maintained (last session <= 7 days):
 *    - Calculate progressive overload target: +2.5 kg or +1 rep.
 * 2. Streak Lost / 1-Week Layoff (last session > 7 days):
 *    - Reset recommendation: -10% safety deload to protect tendons and CNS
 *      from sudden load strain after inactivity.
 */

import { differenceInCalendarDays, parseISO } from 'date-fns';

export interface ExerciseHistoryEntry {
  weight: number; // in kg
  reps: number;
  date: string; // YYYY-MM-DD
  setsCount?: number;
}

export interface ProgressionResult {
  status: 'baseline' | 'overload' | 'layoff-reset';
  lastWeight?: number;
  lastReps?: number;
  lastDate?: string;
  daysElapsed?: number;
  suggestedWeight: number;
  suggestedReps: number;
  message: string;
  badgeLabel: string;
  badgeColor: string;
}

const STORAGE_KEY = 'daily_habit_gym_exercise_history';

/**
 * Normalizes an exercise name (e.g., "1. Bench Press: 4x8 (~70kg)" -> "bench press")
 */
export function normalizeExerciseName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/^\d+[\.\)]\s*/, '') // Remove leading "1. " or "1) "
    .split(':')[0] // Take part before colon
    .replace(/\(.*?\)/g, '') // Remove parenthesis
    .replace(/\[.*?\]/g, '') // Remove brackets
    .trim()
    .toLowerCase();
}

/**
 * Retrieve saved lift history from localStorage for an exercise
 */
export function getExerciseHistory(exerciseName: string): ExerciseHistoryEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = normalizeExerciseName(exerciseName);
    const store = localStorage.getItem(STORAGE_KEY);
    if (!store) return null;
    const history = JSON.parse(store);
    return history[key] || null;
  } catch {
    return null;
  }
}

/**
 * Save completed lift into history
 */
export function saveExerciseHistory(
  exerciseName: string,
  weight: number,
  reps: number,
  date: string,
  setsCount?: number
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = normalizeExerciseName(exerciseName);
    if (!key) return;
    const store = localStorage.getItem(STORAGE_KEY);
    const history = store ? JSON.parse(store) : {};
    history[key] = {
      weight: Number(weight) || 0,
      reps: Number(reps) || 0,
      date,
      setsCount: setsCount || 3,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save exercise history', e);
  }
}

/**
 * Calculate progressive target based on consistency
 * If streak maintained (<= 7 days): suggest overload (+2.5 kg).
 * If streak lost (> 7 days): reset recommendation with safety deload (-10%).
 */
export function calculateProgression(
  exerciseName: string,
  currentDate: string,
  fallbackTargetKg: number = 0
): ProgressionResult {
  const history = getExerciseHistory(exerciseName);

  if (!history || !history.weight) {
    return {
      status: 'baseline',
      suggestedWeight: fallbackTargetKg > 0 ? fallbackTargetKg : 20,
      suggestedReps: 8,
      message: 'First recorded session. Establish your working baseline.',
      badgeLabel: 'New Baseline',
      badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    };
  }

  let daysElapsed = 0;
  try {
    daysElapsed = Math.max(0, differenceInCalendarDays(parseISO(currentDate), parseISO(history.date)));
  } catch {
    daysElapsed = 0;
  }

  // 1-Week Layoff / Inactive Rule (> 7 days)
  if (daysElapsed > 7) {
    // 10% safety deload rounded to nearest 0.5 kg
    const resetWeight = Math.max(2.5, Math.round(history.weight * 0.9 * 2) / 2);
    return {
      status: 'layoff-reset',
      lastWeight: history.weight,
      lastReps: history.reps,
      lastDate: history.date,
      daysElapsed,
      suggestedWeight: resetWeight,
      suggestedReps: history.reps || 8,
      message: `🛡️ 1-Week Break (${daysElapsed}d inactive): Reset to safe comeback weight (-10% deload to protect tendons & joints).`,
      badgeLabel: `Reset -10% (${daysElapsed}d break)`,
      badgeColor: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
  }

  // Streak Maintained (<= 7 days): Progressive Overload
  const overloadWeight = Math.round((history.weight + 2.5) * 2) / 2;
  return {
    status: 'overload',
    lastWeight: history.weight,
    lastReps: history.reps,
    lastDate: history.date,
    daysElapsed,
    suggestedWeight: overloadWeight,
    suggestedReps: history.reps || 8,
    message: `🔥 Streak Maintained (last lifted ${daysElapsed === 0 ? 'today' : `${daysElapsed}d ago`}): Last ${history.weight} kg × ${history.reps}. Target +2.5 kg overload!`,
    badgeLabel: `+2.5 kg Overload`,
    badgeColor: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  };
}

/**
 * Calculates total volume in kilograms (weight * reps for completed sets)
 */
export function calculateVolume(
  exercises: Array<{ sets: Array<{ weight?: number; reps?: number; completed: boolean }> }>
): number {
  return exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, set) => {
      if (!set.completed && !set.weight) return setTotal;
      const w = Number(set.weight) || 0;
      const r = Number(set.reps) || 0;
      return setTotal + (w * r);
    }, 0);
  }, 0);
}

/**
 * Estimates calories burned based on exercise duration and volume moved
 */
export function estimateWorkoutCalories(
  totalVolumeKg: number,
  durationMinutes: number = 45,
  intensity: 'low' | 'medium' | 'high' = 'medium'
): number {
  const intensityMultiplier = { low: 0.85, medium: 1.0, high: 1.25 }[intensity];
  // Base metabolic burn: ~5.5 kcal / min for resistance training
  const timeBurn = durationMinutes * 5.5;
  // Mechanical work component: ~12 kcal per 1,000 kg moved
  const volumeBurn = (totalVolumeKg / 1000) * 12;
  return Math.round((timeBurn + volumeBurn) * intensityMultiplier);
}
