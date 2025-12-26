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

export function getStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  const today = getToday();
  
  let streak = 0;
  let currentDate = new Date(today);
  
  for (const date of sorted) {
    const checkDate = formatDate(currentDate);
    if (date === checkDate) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (streak > 0) {
      break;
    }
  }
  
  return streak;
}

