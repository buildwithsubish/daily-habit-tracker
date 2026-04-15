import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  const date = new Date(year, month - 1, day); // local date
  const dayOfWeek = date.getDay(); // local day of week
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

