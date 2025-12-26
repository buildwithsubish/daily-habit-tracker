'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Dumbbell, Apple } from 'lucide-react';

interface AICoachData {
  healthTip: {
    message: string;
    type: string;
  };
  workoutSuggestion: string;
  dietSuggestion: string;
}

export default function AICoach() {
  const [data, setData] = useState<AICoachData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai-coach')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-sm p-4 sm:p-6 text-white">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Sparkles size={20} className="sm:w-6 sm:h-6" />
          <h3 className="text-base sm:text-xl font-semibold">AI Health Tip</h3>
        </div>
        <p className="text-primary-50 text-sm sm:text-base">{data.healthTip.message}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 border-l-4 border-blue-500">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Dumbbell className="text-blue-500" size={18} />
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Workout Suggestion</h3>
        </div>
        <p className="text-gray-700 text-xs sm:text-sm">{data.workoutSuggestion}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 border-l-4 border-green-500">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Apple className="text-green-500" size={18} />
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Diet Suggestion</h3>
        </div>
        <p className="text-gray-700 text-xs sm:text-sm">{data.dietSuggestion}</p>
      </div>
    </div>
  );
}

