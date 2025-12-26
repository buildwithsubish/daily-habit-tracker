'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, Target, Zap } from 'lucide-react';

interface Stats {
  totalHabits: number;
  completedToday: number;
  weeklyCompletion: number;
  longestStreak: number;
  averageCompletion: number;
}

export default function HabitStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics?days=7')
      .then(res => res.json())
      .then(data => {
        const streaks = Object.values(data.streaks || {}) as Array<{ current: number; longest: number }>;
        const longestStreak = Math.max(...streaks.map(s => s.longest), 0);
        const completionStats = data.completionStats || [];
        const totalDays = completionStats.length;
        const completedDays = completionStats.filter((s: any) => s.completed > 0).length;
        const averageCompletion = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

        setStats({
          totalHabits: data.habitStats?.length || 0,
          completedToday: completionStats.find((s: any) => s.date === new Date().toISOString().split('T')[0])?.completed || 0,
          weeklyCompletion: averageCompletion,
          longestStreak,
          averageCompletion,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      icon: <Target className="text-blue-500" size={20} />,
      label: 'Total Habits',
      value: stats.totalHabits,
      color: 'from-blue-500 to-blue-400',
    },
    {
      icon: <Zap className="text-green-500" size={20} />,
      label: 'Completed Today',
      value: stats.completedToday,
      color: 'from-green-500 to-green-400',
    },
    {
      icon: <TrendingUp className="text-purple-500" size={20} />,
      label: 'Weekly Avg',
      value: `${stats.weeklyCompletion.toFixed(0)}%`,
      color: 'from-purple-500 to-purple-400',
    },
    {
      icon: <Calendar className="text-orange-500" size={20} />,
      label: 'Longest Streak',
      value: `${stats.longestStreak} days`,
      color: 'from-orange-500 to-orange-400',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-3.5 sm:p-4 md:p-6 animate-scale-in">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        <TrendingUp className="text-primary-500 flex-shrink-0" size={18} />
        <span>Quick Stats</span>
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5 sm:gap-3">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-all duration-300 hover-lift"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
              <div className="flex-shrink-0">{stat.icon}</div>
              <span className="text-xs sm:text-sm text-gray-700 font-semibold truncate">{stat.label}</span>
            </div>
            <div className={`text-xl sm:text-2xl font-bold text-gray-900`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

