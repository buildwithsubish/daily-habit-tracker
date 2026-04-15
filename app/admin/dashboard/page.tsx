'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  Users, Target, CheckCircle, TrendingUp, 
  Activity, BarChart3, ArrowUpRight, ArrowDownRight,
  Zap, DollarSign, PieChart as PieChartIcon
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { motion } from 'framer-motion';
import { GlassCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

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
  auditLogs: Array<{ action: string; category: string; createdAt: string; details?: string }>;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const chartData = stats.dailyActivity.map(activity => ({
    date: new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: activity.total,
    completed: activity.completed,
  }));

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={item}>
          <GlassCard className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-700">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="text-white" size={24} />
              </div>
              <Badge variant="glass" className="bg-emerald-500/20 text-emerald-300 border-none">
                <ArrowUpRight size={12} className="mr-1" /> 12%
              </Badge>
            </div>
            <p className="text-indigo-100 text-sm font-medium">Total Users</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stats.totalUsers.toLocaleString()}</h3>
            <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-white w-2/3"></div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={item}>
          <GlassCard className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Zap className="text-white" size={24} />
              </div>
              <Badge variant="glass" className="bg-white/20 text-white border-none">
                Live
              </Badge>
            </div>
            <p className="text-emerald-500 text-sm font-medium">Active Habits</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stats.totalHabits.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2">
               <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-6 w-6 rounded-full border-2 border-emerald-500 bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                      U{i}
                    </div>
                  ))}
               </div>
               <span className="text-xs text-emerald-100 font-medium">+42 active now</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={item}>
          <GlassCard className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden relative">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <Badge variant="glass" className="bg-emerald-500/20 text-emerald-300 border-none">
                {stats.completionRate}%
              </Badge>
            </div>
            <p className="text-slate-400 text-sm font-medium">Completion Rate</p>
            <h3 className="text-3xl font-bold text-white mt-1">{Math.round(stats.completionRate)}%</h3>
            <p className="mt-4 text-xs text-slate-500">Platform-wide average</p>
          </GlassCard>
        </motion.div>

        <motion.div variants={item}>
          <GlassCard className="p-6 bg-gradient-to-br from-violet-600 to-violet-700 overflow-hidden relative">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Target className="text-white" size={24} />
              </div>
            </div>
            <p className="text-violet-100 text-sm font-medium">Total Logs</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stats.totalLogs.toLocaleString()}</h3>
            <div className="mt-4 flex gap-1">
              {stats.dailyActivity.slice(-7).map((day, i) => (
                <div key={i} style={{ height: `${Math.min(100, (day.completed / (day.total || 1)) * 100)}%` }} className="w-full bg-white/20 rounded-sm"></div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={item} className="flex flex-wrap gap-3">
        {['Users', 'Presets', 'Analytics', 'Billing', 'Settings'].map((action) => (
          <Button key={action} variant="outline" className="bg-white border-slate-200 hover:border-indigo-600 hover:text-indigo-600 transition-all font-bold">
            {action}
          </Button>
        ))}
      </motion.div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <div>
                <CardTitle className="text-lg font-bold">System Activity</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Real-time habit completion trends across the platform</p>
              </div>
              <Activity className="text-slate-400" size={20} />
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorCompleted)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.habitsByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="count"
                    >
                      {stats.habitsByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-4">
                {stats.habitsByCategory.map((cat, i) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-sm font-medium text-slate-600">{cat.category}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{cat.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Habits Table & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Top Performing Habits</CardTitle>
                <Button variant="ghost" size="sm" className="text-indigo-600 font-bold">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="h-10 px-4 text-left align-middle font-bold text-slate-500 uppercase tracking-wider text-[10px]">Rank</th>
                        <th className="h-10 px-4 text-left align-middle font-bold text-slate-500 uppercase tracking-wider text-[10px]">Habit</th>
                        <th className="h-10 px-4 text-left align-middle font-bold text-slate-500 uppercase tracking-wider text-[10px]">Category</th>
                        <th className="h-10 px-4 text-right align-middle font-bold text-slate-500 uppercase tracking-wider text-[10px]">Completions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.topHabits.map((habit, index) => (
                        <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 align-middle">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                              #{index + 1}
                            </span>
                          </td>
                          <td className="p-4 align-middle font-bold text-slate-900">{habit.name}</td>
                          <td className="p-4 align-middle">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                                {habit.category}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle text-right font-black text-slate-900">{habit.completions.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
               <CardTitle className="text-lg font-bold">System Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-6">
                  {stats.auditLogs.length > 0 ? stats.auditLogs.map((log, i) => (
                    <div key={i} className="flex gap-4 relative">
                       {i !== stats.auditLogs.length - 1 && <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-slate-100"></div>}
                       <div className={cn("h-6 w-6 rounded-full flex-shrink-0 border-4 border-white shadow-sm z-10", 
                         log.category === 'security' ? 'bg-red-500' : 
                         log.category === 'whatsapp_message' ? 'bg-emerald-500' : 'bg-indigo-500'
                       )}></div>
                       <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 leading-none truncate">{log.action}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.category.replace('_', ' ')}
                          </p>
                       </div>
                    </div>
                  )) : (
                    <div className="py-8 text-center">
                      <p className="text-xs text-slate-400 font-medium italic">No recent activity logs found</p>
                    </div>
                  )}
               </div>
               <Button variant="outline" className="w-full mt-8 font-bold text-xs border-slate-200">View Full Audit Trail</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
