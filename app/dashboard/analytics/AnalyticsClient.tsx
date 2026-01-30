'use client';

import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, Activity, Target, Zap, Award, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const data = [
  { name: 'Mon', completion: 65, consistency: 40 },
  { name: 'Tue', completion: 85, consistency: 60 },
  { name: 'Wed', completion: 75, consistency: 55 },
  { name: 'Thu', completion: 90, consistency: 80 },
  { name: 'Fri', completion: 95, consistency: 85 },
  { name: 'Sat', completion: 70, consistency: 90 },
  { name: 'Sun', completion: 80, consistency: 75 },
];

const categoryData = [
  { name: 'Health', value: 400, color: '#3b82f6' },
  { name: 'Mindset', value: 300, color: '#10b981' },
  { name: 'Growth', value: 300, color: '#f59e0b' },
  { name: 'Other', value: 200, color: '#8b5cf6' },
];

export default function AnalyticsClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-12 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
            <Activity size={14} />
            <span>Biometric Data Analysis</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
            Performance<br />
            <span className="text-slate-300 dark:text-slate-800">Velocity.</span>
          </h1>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none min-w-[200px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Completion Rate</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black dark:text-white">82%</span>
              <span className="text-emerald-500 font-bold text-sm mb-1">+12%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <TrendingUp size={20} className="text-blue-600" />
              Efficiency Curve
            </h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                Completion
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: 'none', 
                    borderRadius: '16px',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#fff', fontWeight: 900, fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="completion" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorCompletion)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="space-y-8">
          <div className="bg-black dark:bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest">Active Streak</h3>
            </div>
            <p className="text-6xl font-black mb-2 tracking-tighter">14 Days</p>
            <p className="text-white/60 font-bold text-sm italic">Next Milestone: 21 Days</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8">Asset Allocation</h3>
            <div className="h-[200px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Target, label: "Protocols Met", value: "128", trend: "+12%" },
          { icon: Activity, label: "Core Focus", value: "Health", trend: "Stable" },
          { icon: Award, label: "Rank", value: "Elite", trend: "Level 14" },
          { icon: Calendar, label: "Compliance", value: "94.2%", trend: "+2.4%" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-blue-600 dark:text-blue-400">
                <stat.icon size={18} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-black dark:text-white">{stat.value}</span>
              <span className="text-[10px] font-black text-emerald-500">{stat.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
