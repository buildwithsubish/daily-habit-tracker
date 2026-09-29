import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DailyLog, Habit } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getToday(): string {
  return formatDate(new Date());
}

export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

export function isToday(date: string): boolean {
  return date === getToday();
}

export function isHabitScheduled(habit: any, dateStr: string): boolean {
  // Parse date string directly to avoid timezone issues
  // Date strings are YYYY-MM-DD, parse parts to get correct day-of-week
  const [year, month, day] = dateStr.split('-').map(Number);
  // A calendar date has the same weekday regardless of the server's timezone.
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const { schedule } = habit;
  if (!schedule) return true;

  if (schedule.custom && schedule.custom.length > 0) {
    return schedule.custom.includes(dayOfWeek);
  }

  if (!isWeekend && schedule.weekdays === false) return false;
  if (isWeekend && schedule.weekends === false) return false;

  return true;
}

/** Returns fully completed habit IDs per date, including multi-step completion rules. */
export function getCompletedHabitIdsByDate(habits: Habit[], logs: DailyLog[]): Map<string, Set<string>> {
  const habitsById = new Map(habits.map(habit => [habit.id, habit]));
  const stepsByDateAndHabit = new Map<string, Set<number | null>>();
  for (const log of logs) {
    if (!log.completed || !habitsById.has(log.habitId)) continue;
    const key = `${log.date}:${log.habitId}`;
    let completedSteps = stepsByDateAndHabit.get(key);
    if (!completedSteps) {
      completedSteps = new Set<number | null>();
      stepsByDateAndHabit.set(key, completedSteps);
    }
    completedSteps.add(log.stepIndex ?? null);
  }

  const completedByDate = new Map<string, Set<string>>();
  for (const [key, completedSteps] of stepsByDateAndHabit) {
    const separator = key.indexOf(':');
    const date = key.slice(0, separator);
    const habitId = key.slice(separator + 1);
    const habit = habitsById.get(habitId)!;
    const isComplete = habit.type === 'single-step'
      ? completedSteps.has(null)
      : habit.steps?.length
        ? habit.steps.every((_, index) => completedSteps.has(index))
        : completedSteps.size > 0;
    if (!isComplete) continue;
    if (!completedByDate.has(date)) completedByDate.set(date, new Set());
    completedByDate.get(date)!.add(habitId);
  }
  return completedByDate;
}
