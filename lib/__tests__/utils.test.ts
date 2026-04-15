import { 
  cn, 
  formatDate, 
  getToday, 
  getDaysAgo, 
  isToday, 
  isHabitScheduled 
} from '../utils';

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
    });

    it('should handle conflicting classes', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('should handle conditional classes', () => {
      expect(cn('base-class', true && 'active', false && 'inactive')).toBe('base-class active');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });
  });

  describe('formatDate', () => {
    it('should format Date object as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should format date string as YYYY-MM-DD', () => {
      expect(formatDate('2024-01-15')).toBe('2024-01-15');
    });

    it('should handle single digit months and days', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(formatDate(date)).toBe('2024-01-05');
    });
  });

  describe('getToday', () => {
    it('should return today\'s date in YYYY-MM-DD format', () => {
      const today = new Date();
      const expected = formatDate(today);
      expect(getToday()).toBe(expected);
    });
  });

  describe('getDaysAgo', () => {
    it('should return date from 1 day ago', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expected = formatDate(yesterday);
      expect(getDaysAgo(1)).toBe(expected);
    });

    it('should return date from 7 days ago', () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const expected = formatDate(weekAgo);
      expect(getDaysAgo(7)).toBe(expected);
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = getToday();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday\'s date', () => {
      const yesterday = getDaysAgo(1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for future date', () => {
      const future = '2025-01-01';
      expect(isToday(future)).toBe(false);
    });
  });

  describe('isHabitScheduled', () => {
    const mockHabit = {
      schedule: {
        weekdays: true,
        weekends: true,
        custom: []
      }
    };

    it('should return true when no schedule is defined', () => {
      const habitWithoutSchedule = {};
      expect(isHabitScheduled(habitWithoutSchedule, '2024-01-15')).toBe(true);
    });

    it('should return true for weekdays when weekdays are enabled', () => {
      const weekdayHabit = {
        schedule: {
          weekdays: true,
          weekends: false,
          custom: []
        }
      };
      // Monday (2024-01-15 was a Monday)
      expect(isHabitScheduled(weekdayHabit, '2024-01-15')).toBe(true);
    });

    it('should return false for weekdays when weekdays are disabled', () => {
      const weekdayHabit = {
        schedule: {
          weekdays: false,
          weekends: true,
          custom: []
        }
      };
      // Monday (2024-01-15 was a Monday)
      expect(isHabitScheduled(weekdayHabit, '2024-01-15')).toBe(false);
    });

    it('should return true for weekends when weekends are enabled', () => {
      const weekendHabit = {
        schedule: {
          weekdays: false,
          weekends: true,
          custom: []
        }
      };
      // Saturday (2024-01-20 was a Saturday)
      expect(isHabitScheduled(weekendHabit, '2024-01-20')).toBe(true);
    });

    it('should return false for weekends when weekends are disabled', () => {
      const weekendHabit = {
        schedule: {
          weekdays: true,
          weekends: false,
          custom: []
        }
      };
      // Saturday (2024-01-20 was a Saturday)
      expect(isHabitScheduled(weekendHabit, '2024-01-20')).toBe(false);
    });

    it('should handle custom schedule', () => {
      const customHabit = {
        schedule: {
          weekdays: true,
          weekends: true,
          custom: [1, 3, 5] // Monday, Wednesday, Friday
        }
      };
      // Monday (day 1)
      expect(isHabitScheduled(customHabit, '2024-01-15')).toBe(true);
      // Tuesday (day 2)
      expect(isHabitScheduled(customHabit, '2024-01-16')).toBe(false);
      // Wednesday (day 3)
      expect(isHabitScheduled(customHabit, '2024-01-17')).toBe(true);
    });

    it('should handle empty custom schedule', () => {
      const emptyCustomHabit = {
        schedule: {
          weekdays: true,
          weekends: true,
          custom: []
        }
      };
      expect(isHabitScheduled(emptyCustomHabit, '2024-01-15')).toBe(true);
    });
  });
});
