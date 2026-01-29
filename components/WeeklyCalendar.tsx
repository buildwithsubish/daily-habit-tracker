'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface WeeklyCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  completionData: Record<string, { completed: number; total: number }>;
}

export default function WeeklyCalendar({ selectedDate, onDateSelect, completionData }: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date(selectedDate));
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => {
    const newWeek = subWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
  };
  const goToNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
  };
  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(today);
    onDateSelect(format(today, 'yyyy-MM-dd'));
  };

  return (
    <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 p-6 sm:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
            <CalendarIcon className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-black uppercase tracking-tight leading-none mb-1">Weekly Protocol</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronization Cycle</p>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goToPreviousWeek}
            className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-500 hover:text-black"
          >
            <ChevronLeft size={20} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goToToday}
            className="px-6 py-2.5 hover:bg-white hover:shadow-sm rounded-xl text-[10px] font-black text-slate-900 uppercase tracking-widest transition-all"
          >
            Current
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goToNextWeek}
            className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-500 hover:text-black"
          >
            <ChevronRight size={20} />
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-4">
        {weekDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(day);
          const { completed = 0, total = 0 } = completionData[dateStr] || {};
          const isFullyCompleted = total > 0 && completed === total;
          
          return (
            <motion.button
              key={index}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDateSelect(dateStr)}
              className={`group relative p-4 sm:p-6 rounded-[2rem] transition-all duration-700 flex flex-col items-center gap-2 ${
                isSelected 
                  ? 'bg-black text-white shadow-2xl shadow-black/20 z-10' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-400'
              }`}
            >
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                isSelected ? 'text-slate-400' : 'text-slate-400 group-hover:text-slate-600'
              }`}>
                {format(day, 'EEE')}
              </span>
              <span className="text-xl sm:text-2xl font-black tracking-tighter">
                {format(day, 'd')}
              </span>
              
              <AnimatePresence>
                {total > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      isFullyCompleted 
                        ? (isSelected ? 'bg-white w-6' : 'bg-black w-3') 
                        : (isSelected ? 'bg-white/40 w-2' : 'bg-slate-300 w-1.5')
                    }`} 
                  />
                )}
              </AnimatePresence>
              
              {isTodayDate && !isSelected && (
                <div className="absolute top-3 right-3 w-2 h-2 bg-black rounded-full animate-pulse" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
