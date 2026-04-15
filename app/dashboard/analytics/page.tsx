'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Calendar, 
  Zap, 
  Target, 
  TrendingUp, 
  ArrowLeft,
  Filter,
  Download,
  Share2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Habit, DailyLog } from '@/types';
import AnalyticsSummary from '@/components/AnalyticsSummary';
import AdvancedAnalytics from '@/components/AdvancedAnalytics';
import { useApp } from '@/context/AppContext';
import { toast } from 'react-hot-toast';

export default function AnalyticsPage() {
  const router = useRouter();
  const { advancedMode } = useApp();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed'>(advancedMode ? 'detailed' : 'summary');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [habitsRes, logsRes] = await Promise.all([
          fetch('/api/habits'),
          fetch('/api/logs?limit=100') // Fetch more logs for analytics
        ]);
        
        const habitsData = await habitsRes.json();
        const logsData = await logsRes.json();
        
        setHabits(habitsData.habits || []);
        setLogs(logsData.logs || []);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-4 transition-colors font-bold uppercase tracking-widest text-[10px]"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h1 className="responsive-text-xl font-black text-slate-900 dark:text-white tracking-tightest flex items-center gap-2 sm:gap-3 leading-none">
            Habit Intelligence
            <SparkleIcon className="text-indigo-500 animate-pulse w-5 h-5 sm:w-8 sm:h-8" />
          </h1>
          <p className="responsive-text-xs sm:responsive-text-base text-slate-500 font-medium mt-1 sm:mt-2 max-w-lg tracking-tight">
            Deep insights into your performance and consistency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  timeRange === range 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 mb-10 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-8 py-4 text-sm font-black uppercase tracking-widest transition-all relative shrink-0 ${
            activeTab === 'summary' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Summary
          {activeTab === 'summary' && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('detailed')}
          className={`px-8 py-4 text-sm font-black uppercase tracking-widest transition-all relative shrink-0 flex items-center gap-2 ${
            activeTab === 'detailed' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Detailed Breakdown
          <Sparkles size={14} />
          {activeTab === 'detailed' && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-slate-50 dark:bg-slate-800/50 animate-pulse rounded-3xl" />
          ))}
          <div className="md:col-span-2 lg:col-span-3 h-[400px] bg-slate-50 dark:bg-slate-800/50 animate-pulse rounded-3xl" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'summary' ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AnalyticsSummary habits={habits} logs={logs} />
            </motion.div>
          ) : (
            <motion.div
              key="detailed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdvancedAnalytics habits={habits} logs={logs} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Quick Actions Float */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50">
        <button className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-black text-slate-500 uppercase tracking-widest">
          <Download size={14} /> Export Report
        </button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
        <button className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-black text-slate-500 uppercase tracking-widest">
          <Share2 size={14} /> Share
        </button>
      </div>
    </div>
  );
}

const SparkleIcon = ({ className }: { className?: string }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 3L14.5 9L21 11.5L14.5 14L12 21L9.5 14L3 11.5L9.5 9L12 3Z" fill="currentColor" />
  </svg>
);

const Sparkles = ({ size }: { size: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 3L14.5 9L21 11.5L14.5 14L12 21L9.5 14L3 11.5L9.5 9L12 3Z" fill="currentColor" />
    <path d="M5 2L6 4L8 5L6 6L5 8L4 6L2 5L4 4L5 2Z" fill="currentColor" />
  </svg>
);
