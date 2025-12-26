'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';

interface WeeklyCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  completionData: Record<string, number>; // date -> completion count
}

export default function WeeklyCalendar({ selectedDate, onDateSelect, completionData }: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date(selectedDate));
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5 sm:p-4 md:p-6 animate-scale-in">
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="text-primary-500 flex-shrink-0" size={18} />
          <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">Weekly View</h3>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={goToPreviousWeek}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} className="text-gray-700" />
          </button>
          <button
            onClick={goToToday}
            className="px-2.5 sm:px-3 py-1 text-xs sm:text-sm text-primary-600 hover:bg-primary-50 rounded-lg font-semibold transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            aria-label="Next week"
          >
            <ChevronRight size={16} className="text-gray-700" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(day);
          const completionCount = completionData[dateStr] || 0;
          const dayName = format(day, 'EEE');
          const dayNumber = format(day, 'd');

          return (
            <button
              key={index}
              onClick={() => onDateSelect(dateStr)}
              className={`
                p-2 sm:p-2.5 md:p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 touch-manipulation
                ${isSelected 
                  ? 'border-primary-500 bg-primary-50 shadow-md' 
                  : 'border-gray-200 hover:border-primary-300'
                }
                ${isTodayDate && !isSelected ? 'bg-blue-50 border-blue-300' : ''}
              `}
            >
              <div className="text-xs text-gray-600 mb-1 font-semibold">{dayName}</div>
              <div className={`
                text-base sm:text-lg font-bold mb-1.5 sm:mb-2
                ${isSelected ? 'text-primary-600' : isTodayDate ? 'text-blue-600' : 'text-gray-900'}
              `}>
                {dayNumber}
              </div>
              {completionCount > 0 && (
                <div className="flex items-center justify-center">
                  <div className={`
                    w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${isSelected 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-green-100 text-green-700'
                    }
                  `}>
                    {completionCount}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

