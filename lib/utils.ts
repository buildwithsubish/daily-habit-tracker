import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
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
  const date = new Date(dateStr);
  const dayOfWeek = date.getUTCDay(); // Use UTC to avoid timezone issues with date strings
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

