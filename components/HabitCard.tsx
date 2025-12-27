'use client';

import { Habit } from '@/types';
import { CheckCircle2, Circle, Heart, Brain, Dumbbell, Utensils, Briefcase, Activity, Zap, Target, Clock } from 'lucide-react';
import { useState } from 'react';
import { getToday } from '@/lib/utils';

interface HabitCardProps {
  habit: Habit;
  completed: boolean;
  stepCompleted?: number[]; // For multi-step habits
  onToggle: (habitId: string, stepIndex?: number) => void;
}

export default function HabitCard({ habit, completed, stepCompleted = [], onToggle }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleStepToggle = (stepIndex: number) => {
    // Prevent event bubbling and ensure proper toggle behavior
    onToggle(habit.id, stepIndex);
  };

  const allStepsCompleted = habit.type === 'multi-step' && 
    habit.steps.every((_, idx) => stepCompleted.includes(idx));

  // Category-specific icon mapping
  const getCategoryIcon = (category: string, completed: boolean, size: number = 26) => {
    const iconProps = {
      size,
      strokeWidth: 2.5,
      className: completed ? 'text-green-500 animate-scale-in' : 'text-gray-400 group-hover:text-primary-500 transition-colors duration-300'
    };

    switch (category) {
      case 'Health':
        return <Heart {...iconProps} className={completed ? 'text-green-500 animate-scale-in' : 'text-red-400 group-hover:text-red-500 transition-colors duration-300'} />;
      case 'Productivity':
        return <Briefcase {...iconProps} className={completed ? 'text-green-500 animate-scale-in' : 'text-blue-400 group-hover:text-blue-500 transition-colors duration-300'} />;
      case 'Mindfulness':
        return <Brain {...iconProps} className={completed ? 'text-green-500 animate-scale-in' : 'text-purple-400 group-hover:text-purple-500 transition-colors duration-300'} />;
      case 'Fitness':
        return <Dumbbell {...iconProps} className={completed ? 'text-green-500 animate-scale-in' : 'text-orange-400 group-hover:text-orange-500 transition-colors duration-300'} />;
      case 'Diet':
        return <Utensils {...iconProps} className={completed ? 'text-green-500 animate-scale-in' : 'text-green-400 group-hover:text-green-500 transition-colors duration-300'} />;
      default:
        return completed ? (
          <CheckCircle2 {...iconProps} className="text-green-500 animate-scale-in" />
        ) : (
          <Circle {...iconProps} className="text-gray-400 group-hover:text-primary-500 transition-colors duration-300" />
        );
    }
  };

  // For step completion icons
  const getStepIcon = (category: string, completed: boolean, size: number = 20) => {
    const iconProps = {
      size,
      strokeWidth: 2.5,
      className: completed ? 'text-green-500' : 'text-gray-400'
    };

    if (completed) {
      return <CheckCircle2 {...iconProps} className="text-green-500" />;
    }

    // Use smaller versions of category icons for steps
    switch (category) {
      case 'Health':
        return <Heart {...iconProps} className="text-red-400" />;
      case 'Productivity':
        return <Briefcase {...iconProps} className="text-blue-400" />;
      case 'Mindfulness':
        return <Brain {...iconProps} className="text-purple-400" />;
      case 'Fitness':
        return <Dumbbell {...iconProps} className="text-orange-400" />;
      case 'Diet':
        return <Utensils {...iconProps} className="text-green-400" />;
      default:
        return <Circle {...iconProps} className="text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5 sm:p-4 md:p-5 hover:shadow-lg transition-all duration-300 hover-lift animate-fade-in-up group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
            <button
              onClick={() => habit.type === 'single-step' ? onToggle(habit.id) : setExpanded(!expanded)}
              className="flex-shrink-0 hover:scale-110 transition-all duration-300 active:scale-95 ripple relative touch-manipulation"
              aria-label={completed ? `Mark ${habit.name} as incomplete` : `Mark ${habit.name} as complete`}
            >
              {habit.type === 'single-step' ? (
                getCategoryIcon(habit.category, completed)
              ) : allStepsCompleted ? (
                getCategoryIcon(habit.category, completed)
              ) : (
                getCategoryIcon(habit.category, false)
              )}
            </button>
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm sm:text-base md:text-lg font-bold break-words transition-all duration-300 ${completed || allStepsCompleted ? 'text-gray-500 line-through' : 'text-gray-900 group-hover:text-primary-600'}`}>
                {habit.name}
              </h3>
              <span className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md mt-1.5 inline-block border border-gray-200 font-medium">
                {habit.category}
              </span>
            </div>
          </div>
          
          {habit.type === 'multi-step' && expanded && (
            <div className="mt-3 sm:mt-4 space-y-2 pl-9 sm:pl-11 md:pl-14 border-t border-gray-100 pt-3 sm:pt-4">
              {habit.steps.map((step, idx) => {
                const isStepCompleted = stepCompleted.includes(idx);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 sm:gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <button 
                      onClick={() => handleStepToggle(idx)} 
                      className="hover:scale-110 transition-transform active:scale-95 flex-shrink-0 touch-manipulation"
                      aria-label={isStepCompleted ? `Mark step ${idx + 1} as incomplete` : `Mark step ${idx + 1} as complete`}
                    >
                      {getStepIcon(habit.category, isStepCompleted)}
                    </button>
                    <span className={`text-xs sm:text-sm md:text-base flex-1 leading-relaxed ${isStepCompleted ? 'line-through text-gray-500' : 'text-gray-800 font-medium'}`}>
                      {step.order + 1}. {step.name}
                      {step.duration && <span className="text-gray-500 ml-1 sm:ml-2 text-xs">({step.duration} min)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Small circle completion button on the right */}
        <div className="flex-shrink-0 flex items-center">
          <button
            onClick={() => habit.type === 'single-step' ? onToggle(habit.id) : onToggle(habit.id)}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation ${
              completed || allStepsCompleted
                ? 'bg-green-500 border-green-500 text-white shadow-lg animate-scale-in'
                : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
            }`}
            aria-label={completed || allStepsCompleted ? `Mark ${habit.name} as incomplete` : `Mark ${habit.name} as complete`}
          >
            {(completed || allStepsCompleted) && (
              <CheckCircle2 size={18} className="text-white" />
            )}
          </button>
        </div>
      </div>
      
      {habit.type === 'multi-step' && !expanded && (
        <div className="mt-3 sm:mt-4 pl-9 sm:pl-11 md:pl-14">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2 sm:h-2.5 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 sm:h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(stepCompleted.length / habit.steps.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 min-w-[2.5rem] sm:min-w-[3rem] text-right">
              {stepCompleted.length}/{habit.steps.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

