"use client";

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Users, CheckCircle, Clock, 
  Filter, Calendar, Download, Share2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

// Mock data for cohort analysis
const cohortData = [
  { month: 'Oct 2025', size: 1200, d0: 100, d1: 45, d7: 32, d30: 24 },
  { month: 'Nov 2025', size: 1500, d0: 100, d1: 48, d7: 35, d30: 28 },
  { month: 'Dec 2025', size: 1800, d0: 100, d1: 52, d7: 38, d30: 31 },
  { month: 'Jan 2026', size: 2100, d0: 100, d1: 55, d7: 42, d30: null },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminAnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats');
      return res.json();
    }
  });

  const getHeatmapColor = (value: number | null) => {
    if (value === null) return 'bg-slate-50 text-slate-300';
    if (value === 100) return 'bg-indigo-600 text-white';
    if (value > 50) return 'bg-indigo-500 text-white';
    if (value > 40) return 'bg-indigo-400 text-white';
    if (value > 30) return 'bg-indigo-300 text-indigo-900';
    if (value > 20) return 'bg-indigo-200 text-indigo-900';
    return 'bg-indigo-100 text-indigo-800';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Advanced Analytics</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Deep dive into user retention and habit completion funnels</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-bold border-slate-200">
             <Filter size={14} className="mr-2" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="font-bold border-slate-200">
             <Calendar size={14} className="mr-2" /> Last 90 Days
          </Button>
          <Button size="sm" className="font-bold shadow-lg shadow-indigo-600/20">
             <Download size={14} className="mr-2" /> Export Report
          </Button>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Daily Active Users (DAU)</CardTitle>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">+12.5%</Badge>
          </CardHeader>
          <CardContent>
             <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={stats?.dailyActivity}>
                      <defs>
                        <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        fill="url(#colorDau)" 
                      />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Completion Rate by Category</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={stats?.habitsByCategory}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                         {stats?.habitsByCategory.map((entry: any, index: number) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis Table */}
      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Retention Cohorts</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Percentage of users who returned after their first day</p>
              </div>
              <Badge variant="outline" className="font-bold">Monthly Basis</Badge>
           </div>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                 <thead>
                    <tr>
                       <th className="p-3 text-left bg-slate-50 border border-slate-100 font-bold text-slate-500 uppercase text-[10px]">Cohort</th>
                       <th className="p-3 text-left bg-slate-50 border border-slate-100 font-bold text-slate-500 uppercase text-[10px]">New Users</th>
                       <th className="p-3 text-center bg-slate-50 border border-slate-100 font-bold text-slate-500 uppercase text-[10px]">Day 0</th>
                       <th className="p-3 text-center bg-slate-50 border border-slate-100 font-bold text-slate-500 uppercase text-[10px]">Day 1</th>
                       <th className="p-3 text-center bg-slate-50 border border-slate-100 font-bold text-slate-500 uppercase text-[10px]">Day 7</th>
                       <th className="p-3 text-center bg-slate-50 border border-slate-100 font-bold text-slate-500 uppercase text-[10px]">Day 30</th>
                    </tr>
                 </thead>
                 <tbody>
                    {cohortData.map((row, i) => (
                       <tr key={i}>
                          <td className="p-3 border border-slate-100 font-bold text-slate-900">{row.month}</td>
                          <td className="p-3 border border-slate-100 font-medium text-slate-600">{row.size.toLocaleString()}</td>
                          <td className={cn("p-3 border border-white text-center font-bold text-xs transition-colors", getHeatmapColor(row.d0))}>
                             {row.d0}%
                          </td>
                          <td className={cn("p-3 border border-white text-center font-bold text-xs transition-colors", getHeatmapColor(row.d1))}>
                             {row.d1}%
                          </td>
                          <td className={cn("p-3 border border-white text-center font-bold text-xs transition-colors", getHeatmapColor(row.d7))}>
                             {row.d7}%
                          </td>
                          <td className={cn("p-3 border border-white text-center font-bold text-xs transition-colors", getHeatmapColor(row.d30))}>
                             {row.d30 ? `${row.d30}%` : '-'}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </CardContent>
      </Card>

      {/* Habits Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-1">
            <CardHeader>
               <CardTitle className="text-lg font-bold">Onboarding Funnel</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-6">
                  {[
                    { label: 'Registered', count: '100%', color: 'bg-indigo-600' },
                    { label: 'Created Habit', count: '82%', color: 'bg-indigo-500' },
                    { label: 'First Log', count: '64%', color: 'bg-indigo-400' },
                    { label: '7-Day Streak', count: '28%', color: 'bg-indigo-300' },
                  ].map((step, i) => (
                    <div key={i} className="relative">
                       <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-700">{step.label}</span>
                          <span className="text-xs font-black text-slate-900">{step.count}</span>
                       </div>
                       <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: step.count }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className={cn("h-full rounded-full", step.color)}
                          />
                       </div>
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>

         <Card className="lg:col-span-2">
            <CardHeader>
               <CardTitle className="text-lg font-bold">Peak Engagement Times</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={stats?.dailyActivity}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="step" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={false} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
