'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Target, CheckCircle, TrendingUp, 
  Activity, BarChart3, Shield, LogOut
} from 'lucide-react';
import Link from 'next/link';
import { 
  AreaChart, Area,
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

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-white" size={24} />
              <h1 className="text-xl font-bold tracking-tight">System Control</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/users"
                className="text-sm font-medium hover:text-slate-300 transition-colors"
              >
                Users
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-sm font-bold"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', border: 'border-blue-200' },
            { label: 'Total Habits', value: stats.totalHabits, icon: Target, color: 'text-emerald-600', border: 'border-emerald-200' },
            { label: 'Total Logs', value: stats.totalLogs, icon: CheckCircle, color: 'text-violet-600', border: 'border-violet-200' },
            { label: 'Completion Rate', value: `${stats.completionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-amber-600', border: 'border-amber-200' },
          ].map((item, i) => (
            <div key={i} className={`bg-white rounded-2xl p-6 shadow-sm border ${item.border} hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
                <item.icon className={item.color} size={24} />
              </div>
              <p className="text-3xl font-black text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="text-slate-900" size={20} />
              System Activity
            </h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#0f172a" 
                    strokeWidth={3}
                    fill="url(#colorTotal)" 
                    name="Completed Tasks" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Categories Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="text-slate-900" size={20} />
              Distribution
            </h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.habitsByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {stats.habitsByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {stats.habitsByCategory.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-medium text-slate-600 truncate">{cat.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Habits */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Top Performing Habits</h2>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">Global Ranking</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Habit</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Completions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.topHabits.map((habit, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{habit.name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-600">{habit.category}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-black text-slate-900">{habit.completions}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
