'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Target, CheckCircle, TrendingUp, 
  Activity, BarChart3, Shield, LogOut, Palette
} from 'lucide-react';
import Link from 'next/link';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface AdminStats {
  totalUsers: number;
  totalHabits: number;
  totalLogs: number;
  completedLogs: number;
  completionRate: number;
  recentUsers: number;
  habitsByCategory: Array<{ category: string; count: number }>;
  topHabits: Array<{ name: string; category: string; completions: number }>;
  dailyActivity: Array<{ date: string; total: number; completed: number }>;
}

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedingThemes, setSeedingThemes] = useState(false);
  const [seedMessage, setSeedMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'same-origin' });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDeadlyThemes = async () => {
    setSeedingThemes(true);
    try {
      const res = await fetch('/api/admin/seed-deadly-themes', {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setSeedMessage({
          type: 'success',
          text: `✅ Successfully created ${data.themesCreated} deadly dark themes! Refresh the Themes page to see them.`
        });
        // Refresh theme cache
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const error = await res.json();
        setSeedMessage({
          type: 'error',
          text: `❌ Failed to seed themes: ${error.error || 'Unknown error'}`
        });
      }
    } catch (error: any) {
      setSeedMessage({
        type: 'error',
        text: `❌ Error: ${error.message}`
      });
    } finally {
      setSeedingThemes(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  const chartData = stats.dailyActivity.map(activity => ({
    date: new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: activity.total,
    completed: activity.completed,
    completionRate: activity.total > 0 ? (activity.completed / activity.total) * 100 : 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-white" size={28} />
              <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/themes"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-semibold"
              >
                <Palette size={18} />
                Themes
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-semibold"
              >
                <Users size={18} />
                Users
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-semibold"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6">
        {/* Seed Message */}
        {seedMessage && (
          <div className={`mb-6 p-4 rounded-lg border ${
            seedMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <span>{seedMessage.text}</span>
              <button
                onClick={() => setSeedMessage(null)}
                className="text-sm font-medium hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-t-4 border-red-600">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleSeedDeadlyThemes}
              disabled={seedingThemes}
              className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Palette size={20} />
              <div className="text-left">
                <div className="font-semibold">Seed Deadly Themes</div>
                <div className="text-xs opacity-90">Create 28 dark/black/red color combinations</div>
              </div>
              {seedingThemes && <div className="animate-spin ml-auto">⏳</div>}
            </button>
            <Link
              href="/admin/themes"
              className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all"
            >
              <Palette size={20} />
              <div className="text-left">
                <div className="font-semibold">Manage Themes</div>
                <div className="text-xs opacity-90">Edit, create, and customize themes</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
              </div>
              <Users className="text-blue-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Total Habits</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalHabits}</p>
              </div>
              <Target className="text-green-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Total Logs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalLogs}</p>
              </div>
              <CheckCircle className="text-purple-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="text-orange-500" size={40} />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Activity */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="text-red-600" size={20} />
              Daily Activity (Last 30 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="total" stroke="#0284c7" fill="url(#colorTotal)" name="Total" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Habits by Category */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="text-red-600" size={20} />
              Habits by Category
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.habitsByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, count }) => `${category}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.habitsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Habits */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performing Habits</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Habit</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Completions</th>
                </tr>
              </thead>
              <tbody>
                {stats.topHabits.map((habit, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{habit.name}</td>
                    <td className="py-3 px-4 text-gray-600">{habit.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">{habit.completions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

