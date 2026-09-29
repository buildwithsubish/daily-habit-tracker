'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday } from 'date-fns';

interface WeeklyCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  completionData: Record<string, { completed: number; total: number }>;
}

export default function WeeklyCalendar({ selectedDate, onDateSelect, completionData }: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date(`${selectedDate}T12:00:00`));
  useEffect(() => setCurrentWeek(new Date(`${selectedDate}T12:00:00`)), [selectedDate]);
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => {
    const targetDate = subWeeks(new Date(`${selectedDate}T12:00:00`), 1);
    setCurrentWeek(targetDate);
    onDateSelect(format(targetDate, 'yyyy-MM-dd'));
  };
  const goToNextWeek = () => {
    const nextWeek = addWeeks(currentWeek, 1);
    if (startOfWeek(nextWeek, { weekStartsOn: 1 }) > startOfWeek(today, { weekStartsOn: 1 })) return;
    const targetDate = addWeeks(new Date(`${selectedDate}T12:00:00`), 1);
    const boundedTarget = format(targetDate, 'yyyy-MM-dd') > todayKey ? today : targetDate;
    setCurrentWeek(boundedTarget);
    onDateSelect(format(boundedTarget, 'yyyy-MM-dd'));
  };
  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(today);
    onDateSelect(format(today, 'yyyy-MM-dd'));
  };

  const isCurrentWeek = format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd') === format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return (
    <section aria-label="Weekly habit history" className="mb-5 rounded-2xl border border-slate-200 bg-[#fbfaf7] p-4 dark:border-slate-800 dark:bg-slate-900/70 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><CalendarIcon size={16} className="text-indigo-700 dark:text-indigo-300" /> Weekly history</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">Choose a date to review its progress. Older days are available to review as read-only.</p>
        </div>
        <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          <button
            onClick={goToPreviousWeek}
            aria-label="Previous week"
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          {!isCurrentWeek && <button
            onClick={goToToday}
            className="min-h-10 rounded-md px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Today
          </button>}
          <button
            onClick={goToNextWeek}
            aria-label="Next week"
            disabled={isCurrentWeek}
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          if (dateStr > todayKey) return <div aria-hidden="true" key={index} />;
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(day);
          const isReadOnly = dateStr < format(addDays(today, -7), 'yyyy-MM-dd');
          const { completed = 0, total = 0 } = completionData[dateStr] || {};
          
          return (
            <button
              key={index}
              onClick={() => onDateSelect(dateStr)}
              aria-pressed={isSelected}
              aria-label={`${format(day, 'EEEE, MMMM d')}: ${completed} of ${total} habits complete${isReadOnly ? ', read only' : ''}`}
              className={`relative min-h-[76px] rounded-xl border px-1.5 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isSelected
                  ? 'border-indigo-800 bg-indigo-900 text-white shadow-sm dark:border-indigo-300 dark:bg-indigo-200 dark:text-slate-950'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
              }`}
            >
              <span className="block text-[11px] font-medium opacity-75">{format(day, 'EEE')}</span>
              <span className="block text-base font-semibold tabular-nums">{format(day, 'd')}</span>
              <span className="mt-0.5 block text-[11px] tabular-nums opacity-75">{total ? `${completed}/${total}` : 'Rest'}</span>
              {isReadOnly && <span className="mt-0.5 block text-[9px] font-medium opacity-65">Review</span>}
              {isTodayDate && !isSelected && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
