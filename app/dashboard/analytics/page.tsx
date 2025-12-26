'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Flame, Calendar, Target, Zap, Award, Activity, BarChart3 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears } from 'date-fns';

interface AnalyticsData {
  completionStats: Array<{ date: string; total: number; completed: number }>;
  habitStats: Array<{ id: string; name: string; category: string; totalLogs: number; completedLogs: number }>;
  streaks: Record<string, { current: number; longest: number; lastDate: string | null }>;
}

type Period = 'weekly' | 'monthly' | 'yearly';

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('monthly');
  const [animatedStats, setAnimatedStats] = useState({
    totalCompleted: 0,
    averageCompletion: 0,
    totalStreak: 0,
    bestHabit: '',
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  useEffect(() => {
    if (data) {
      animateStats();
    }
  }, [data]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateStats = () => {
    if (!data) return;
    
    const totalCompleted = data.completionStats.reduce((sum, stat) => sum + stat.completed, 0);
    const totalPossible = data.completionStats.reduce((sum, stat) => sum + stat.total, 0);
    const averageCompletion = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;
    const streaks = Object.values(data.streaks);
    const totalStreak = Math.max(...streaks.map(s => s.longest), 0);
    const bestHabit = data.habitStats.reduce((best, habit) => {
      const bestRate = best.completedLogs / (best.totalLogs || 1);
      const currentRate = habit.completedLogs / (habit.totalLogs || 1);
      return currentRate > bestRate ? habit : best;
    }, data.habitStats[0] || { name: 'N/A' });

    // Animate numbers
    const duration = 1500;
    const steps = 60;
    const stepTime = duration / steps;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setAnimatedStats({
        totalCompleted: Math.floor(totalCompleted * progress),
        averageCompletion: averageCompletion * progress,
        totalStreak: Math.floor(totalStreak * progress),
        bestHabit: bestHabit.name || 'N/A',
      });

      if (step >= steps) {
        clearInterval(interval);
        setAnimatedStats({
          totalCompleted,
          averageCompletion,
          totalStreak,
          bestHabit: bestHabit.name || 'N/A',
        });
      }
    }, stepTime);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === 'weekly') {
      return format(date, 'EEE');
    } else if (period === 'monthly') {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MMM');
    }
  };

  const completionChartData = data.completionStats.map(stat => ({
    date: formatDate(stat.date),
    fullDate: stat.date,
    completionRate: stat.total > 0 ? (stat.completed / stat.total) * 100 : 0,
    completed: stat.completed,
    total: stat.total,
  }));

  const habitChartData = data.habitStats
    .map(stat => ({
      name: stat.name.length > 12 ? stat.name.substring(0, 12) + '...' : stat.name,
      fullName: stat.name,
      completionRate: stat.totalLogs > 0 ? (stat.completedLogs / stat.totalLogs) * 100 : 0,
      completed: stat.completedLogs,
      total: stat.totalLogs,
      category: stat.category,
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  const categoryData = data.habitStats.reduce((acc, habit) => {
    const category = habit.category;
    if (!acc[category]) {
      acc[category] = { completed: 0, total: 0 };
    }
    acc[category].completed += habit.completedLogs;
    acc[category].total += habit.totalLogs;
    return acc;
  }, {} as Record<string, { completed: number; total: number }>);

  const pieChartData = Object.entries(categoryData).map(([name, stats]) => ({
    name,
    value: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    completed: stats.completed,
    total: stats.total,
  }));

  const totalHabits = data.habitStats.length;
  const totalCompleted = data.completionStats.reduce((sum, stat) => sum + stat.completed, 0);
  const totalPossible = data.completionStats.reduce((sum, stat) => sum + stat.total, 0);
  const overallCompletion = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 animate-fade-in-up">
      {/* Header */}
      <div className="mb-5 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1.5 sm:mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Track your progress and performance</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 ${
                period === 'weekly'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 ${
                period === 'monthly'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 ${
                period === 'yearly'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-5 text-white hover:shadow-xl transition-all duration-300 hover-lift animate-scale-in">
          <div className="flex items-center justify-between mb-2">
            <Target className="text-white opacity-90" size={24} />
            <span className="text-2xl sm:text-3xl font-bold">{animatedStats.totalCompleted}</span>
          </div>
          <p className="text-sm sm:text-base font-semibold opacity-90">Total Completed</p>
          <p className="text-xs opacity-75 mt-1">{period.charAt(0).toUpperCase() + period.slice(1)} Period</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-5 text-white hover:shadow-xl transition-all duration-300 hover-lift animate-scale-in animation-delay-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-white opacity-90" size={24} />
            <span className="text-2xl sm:text-3xl font-bold">{animatedStats.averageCompletion.toFixed(1)}%</span>
          </div>
          <p className="text-sm sm:text-base font-semibold opacity-90">Avg Completion</p>
          <p className="text-xs opacity-75 mt-1">Overall Performance</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 sm:p-5 text-white hover:shadow-xl transition-all duration-300 hover-lift animate-scale-in animation-delay-400">
          <div className="flex items-center justify-between mb-2">
            <Flame className="text-white opacity-90" size={24} />
            <span className="text-2xl sm:text-3xl font-bold">{animatedStats.totalStreak}</span>
          </div>
          <p className="text-sm sm:text-base font-semibold opacity-90">Longest Streak</p>
          <p className="text-xs opacity-75 mt-1">Days in a row</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 sm:p-5 text-white hover:shadow-xl transition-all duration-300 hover-lift animate-scale-in animation-delay-600">
          <div className="flex items-center justify-between mb-2">
            <Award className="text-white opacity-90" size={24} />
            <span className="text-lg sm:text-xl font-bold truncate">{animatedStats.bestHabit}</span>
          </div>
          <p className="text-sm sm:text-base font-semibold opacity-90">Best Performer</p>
          <p className="text-xs opacity-75 mt-1">Top habit</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-5 sm:mb-6">
        {/* Completion Rate Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-all duration-300 animate-scale-in">
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <Activity className="text-primary-600" size={20} />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Completion Rate Over Time</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={completionChartData}>
              <defs>
                <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion Rate']}
              />
              <Area 
                type="monotone" 
                dataKey="completionRate" 
                stroke="#0284c7" 
                strokeWidth={3}
                fill="url(#colorCompletion)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-all duration-300 animate-scale-in animation-delay-200">
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <BarChart3 className="text-primary-600" size={20} />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Category Performance</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                animationDuration={1500}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Habit Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-all duration-300 animate-scale-in mb-5 sm:mb-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <Target className="text-primary-600" size={20} />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Habit Performance</h2>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={habitChartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={120}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion Rate']}
            />
            <Bar 
              dataKey="completionRate" 
              fill="#0284c7"
              radius={[0, 8, 8, 0]}
              animationDuration={1500}
            >
              {habitChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Streaks Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Object.entries(data.streaks).map(([habitId, streak], index) => {
          const habit = data.habitStats.find(h => h.id === habitId);
          if (!habit) return null;
          return (
            <div 
              key={habitId} 
              className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-all duration-300 hover-lift animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Flame className="text-orange-500" size={20} />
                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{habit.name}</h3>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-semibold">Current Streak</span>
                  <span className="text-lg sm:text-xl font-bold text-primary-600">{streak.current} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-semibold">Longest Streak</span>
                  <span className="text-lg sm:text-xl font-bold text-gray-900">{streak.longest} days</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 font-medium">Completion Rate</span>
                    <span className="text-sm font-bold text-gray-900">
                      {habit.totalLogs > 0 ? ((habit.completedLogs / habit.totalLogs) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${habit.totalLogs > 0 ? (habit.completedLogs / habit.totalLogs) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
