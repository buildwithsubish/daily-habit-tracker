'use client';

import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, LineChart, Line
} from 'recharts';
import { Target, ArrowUpRight, Flame, Brain, Heart } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

// Color classes mapping to avoid dynamic Tailwind class issues
const colorClasses = {
  orange: {
    icon: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    gradient: 'from-orange-500/10',
  },
  blue: {
    icon: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    gradient: 'from-blue-500/10',
  },
  purple: {
    icon: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    gradient: 'from-purple-500/10',
  },
  green: {
    icon: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    gradient: 'from-green-500/10',
  },
};

const weeklyData = [
  { name: 'Mon', completion: 65, consistency: 40, focus: 72 },
  { name: 'Tue', completion: 85, consistency: 60, focus: 88 },
  { name: 'Wed', completion: 75, consistency: 55, focus: 68 },
  { name: 'Thu', completion: 90, consistency: 80, focus: 92 },
  { name: 'Fri', completion: 95, consistency: 85, focus: 78 },
  { name: 'Sat', completion: 70, consistency: 90, focus: 65 },
  { name: 'Sun', completion: 80, consistency: 75, focus: 82 },
];

const monthlyTrend = [
  { week: 'W1', rate: 62 },
  { week: 'W2', rate: 74 },
  { week: 'W3', rate: 78 },
  { week: 'W4', rate: 85 },
];

const categoryData = [
  { name: 'Health', value: 35, color: '#10b981' },
  { name: 'Mindset', value: 25, color: '#3b82f6' },
  { name: 'Growth', value: 28, color: '#f59e0b' },
  { name: 'Focus', value: 12, color: '#8b5cf6' },
];

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

const chartVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

export default function AnalyticsClient() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'week' | 'month'>('week');
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-[#fafafa] dark:bg-[#050505] pb-20"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4"
            >
              <Target size={12} />
              <span>Performance Analytics</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none"
            >
              Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> Progress</span>
            </motion.h1>
          </div>
          
          {/* Tab Switcher */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg"
          >
            {['week', 'month'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'week' | 'month')}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                  activeTab === tab
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Main Stats Grid */}
      <motion.div variants={containerVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[
            { icon: Flame, label: 'Current Streak', value: '14', suffix: 'Days', colorKey: 'orange' },
            { icon: Target, label: 'Completion', value: '82', suffix: '%', colorKey: 'blue' },
            { icon: Brain, label: 'Focus Score', value: '78', suffix: '%', colorKey: 'purple' },
            { icon: Heart, label: 'Health', value: '91', suffix: '%', colorKey: 'green' },
          ].map((stat, index) => {
            const colors = colorClasses[stat.colorKey as keyof typeof colorClasses];
            return (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              onHoverStart={() => setHoveredStat(index)}
              onHoverEnd={() => setHoveredStat(null)}
              className={`relative overflow-hidden ${colors.bg} p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 cursor-pointer`}
            >
              <motion.div
                animate={{ 
                  scale: hoveredStat === index ? 1.1 : 1,
                  rotate: hoveredStat === index ? 5 : 0
                }}
                className={`w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center mb-4 shadow-lg`}
              >
                <stat.icon size={24} className={colors.icon} />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter"
              >
                {stat.value}
                <span className="text-lg text-slate-400 ml-1">{stat.suffix}</span>
              </motion.div>
              
              <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                {stat.label}
              </div>
              
              {/* Decorative gradient overlay */}
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br ${colors.gradient} to-transparent rounded-full blur-xl`} />
            </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={containerVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Main Performance Chart */}
          <motion.div variants={chartVariants} className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Performance Trend</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Daily completion rate</p>
              </div>
              <div className="flex gap-3">
                {['completion', 'consistency'].map((metric) => (
                  <div key={metric} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${metric === 'completion' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{metric}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <motion.div 
              className="h-[300px] w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConsistency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 800, fontSize: '12px', marginBottom: '8px' }}
                    itemStyle={{ fontWeight: 600, fontSize: '11px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completion" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCompletion)"
                    animationDuration={1500}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="consistency" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorConsistency)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div variants={chartVariants} className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Category Split</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Time allocation</p>
            </div>
            
            <motion.div 
              className="h-[200px] w-full flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    animationDuration={1500}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 14px'
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 700, fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
            
            <div className="grid grid-cols-2 gap-3 mt-6">
              {categoryData.map((cat) => (
                <motion.div
                  key={cat.name}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">{cat.name}</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white ml-auto">{cat.value}%</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Monthly Progress Bar */}
      <motion.div variants={containerVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <motion.div 
          variants={chartVariants}
          className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-blue-600 dark:to-indigo-700 p-8 lg:p-10 rounded-3xl text-white relative overflow-hidden shadow-2xl"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-black tracking-tight mb-2">Monthly Progress</h3>
              <p className="text-white/60 font-medium text-sm">Keep up the momentum!</p>
            </div>
            
            <div className="flex-1 max-w-xl">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-3">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
              <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">62%</span>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">85%</span>
              </div>
            </div>
            
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-3 bg-white/20 backdrop-blur px-6 py-4 rounded-2xl"
            >
              <ArrowUpRight size={24} />
              <div>
                <div className="text-2xl font-black">+12%</div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">This Month</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Insights Cards */}
      <motion.div variants={containerVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              title: 'Best Day', 
              value: 'Friday', 
              subtitle: '95% completion',
              icon: '🏆',
              gradient: 'from-yellow-500 to-orange-500'
            },
            { 
              title: 'Most Consistent', 
              value: 'Morning', 
              subtitle: '6AM - 10AM',
              icon: '⏰',
              gradient: 'from-blue-500 to-cyan-500'
            },
            { 
              title: 'Top Category', 
              value: 'Health', 
              subtitle: '35% of habits',
              icon: '💪',
              gradient: 'from-green-500 to-emerald-500'
            },
            { 
              title: 'Next Goal', 
              value: '21 Day', 
              subtitle: 'Streak milestone',
              icon: '🎯',
              gradient: 'from-purple-500 to-pink-500'
            },
          ].map((insight, index) => (
            <motion.div
              key={insight.title}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${insight.gradient} flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                {insight.icon}
              </div>
              <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{insight.title}</h4>
              <div className="text-xl font-black text-slate-900 dark:text-white">{insight.value}</div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{insight.subtitle}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

