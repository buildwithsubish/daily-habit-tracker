'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';

interface WeeklyCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  completionData: Record<string, { completed: number; total: number }>;
}

export default function WeeklyCalendar({ selectedDate, onDateSelect, completionData }: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date(selectedDate));
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(today);
    onDateSelect(format(today, 'yyyy-MM-dd'));
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Week View</h3>
        
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            onClick={goToPreviousWeek}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(day);
          const { completed = 0, total = 0 } = completionData[dateStr] || {};
          const isFullyCompleted = total > 0 && completed === total;
          
          return (
            <button
              key={index}
              onClick={() => onDateSelect(dateStr)}
              className={`relative p-2.5 sm:p-3.5 rounded-lg transition-all duration-150 flex flex-col items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
              }`}
            >
              <span className={`text-[10px] font-medium uppercase ${
                isSelected ? 'text-indigo-200' : 'text-slate-400'
              }`}>
                {format(day, 'EEE')}
              </span>
              <span className="text-lg sm:text-xl font-bold leading-none">
                {format(day, 'd')}
              </span>
              
              {total > 0 && (
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isFullyCompleted
                    ? (isSelected ? 'bg-white' : 'bg-emerald-500')
                    : completed > 0
                      ? (isSelected ? 'bg-indigo-300' : 'bg-slate-300')
                      : 'bg-transparent'
                }`} />
              )}
              
              {isTodayDate && !isSelected && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
