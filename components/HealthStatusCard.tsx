'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity, Target, Zap, ChevronRight, Scale, Ruler, User as UserIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { DailyLog } from '@/types';

interface HealthStatusCardProps {
  onSetupRequest?: () => void;
  logs?: DailyLog[];
}

export default function HealthStatusCard({ onSetupRequest, logs = [] }: HealthStatusCardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.age) setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="card h-48 animate-pulse bg-zinc-50 dark:bg-zinc-800/20" />
  );

  if (!profile) return (
    <div className="card p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-500/50 transition-all" onClick={onSetupRequest}>
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
        <Heart className="text-zinc-400 group-hover:text-indigo-500 transition-colors" size={24} />
      </div>
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Unlock Health Insights</h3>
      <p className="text-[11px] text-zinc-500 mt-1 max-w-[180px]">Set up your health profile to see TDEE and tailored goals.</p>
      <button className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
        Configure Now <ChevronRight size={10} />
      </button>
    </div>
  );

  // Compute live trajectory from logs
  const calculateWorkoutStats = () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentWorkoutLogs = logs.filter(l => 
      l.workoutData && new Date(l.date) > oneWeekAgo
    );
    
    const recentBurn = recentWorkoutLogs.reduce((acc, l) => acc + (l.workoutData?.caloriesBurned || 0), 0);
    const recentCount = recentWorkoutLogs.length;

    return { recentBurn, recentCount };
  };

  const workoutStats = calculateWorkoutStats();

  let totalDailyDeficit = 0;
  let trajectoryWeeks = 0;
  let targetCalculated = false;

  if (profile.targetWeight && profile.weight && profile.healthGoal && workoutStats.recentCount > 0) {
    // Basic BMR / TDEE approx for current weight
    let bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
    if (profile.gender === 'male') bmr += 5;
    else if (profile.gender === 'female') bmr -= 161;
    else bmr -= 78;

    const activityMultipliers: any = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extra: 1.9 };
    const tdee = bmr * (activityMultipliers[profile.activityLevel] || 1.2);
    
    // Target base food calories (500 kcal deficit based)
    let foodCalorieTarget = tdee;
    if (profile.healthGoal === 'loss') foodCalorieTarget -= 500;
    else if (profile.healthGoal === 'gain') foodCalorieTarget += 500;

    const foodDeficit = Math.abs(tdee - foodCalorieTarget);
    const avgDailyWorkoutBurn = workoutStats.recentBurn / 7;

    totalDailyDeficit = Math.round(foodDeficit + avgDailyWorkoutBurn);
    const totalKcalDiff = Math.abs(profile.weight - profile.targetWeight) * 7700;

    if (totalDailyDeficit > 50) {
      trajectoryWeeks = Math.round((totalKcalDiff / totalDailyDeficit) / 7);
      targetCalculated = true;
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium p-6 overflow-hidden relative group"
    >
      <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-[0.03] dark:opacity-[0.07] group-hover:scale-110 transition-transform duration-700">
        <Activity size={120} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
            <Heart size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Health Status</h3>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">{profile.healthGoal === 'loss' ? 'Shred Mode' : profile.healthGoal === 'gain' ? 'Bulk Mode' : 'Maintenance'}</p>
          </div>
        </div>
        <button onClick={onSetupRequest} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                <Scale size={16} />
             </div>
             <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Weight</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{profile.weight} <span className="text-[10px] text-zinc-500 font-medium">kg</span></p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                <Ruler size={16} />
             </div>
             <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Height</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{profile.height} <span className="text-[10px] text-zinc-500 font-medium">cm</span></p>
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Target size={16} />
             </div>
             <div>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">Age</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{profile.age} <span className="text-[10px] text-zinc-500 font-medium">yrs</span></p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Zap size={16} />
             </div>
             <div>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">Activity</p>
                <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate w-20 capitalize">{profile.activityLevel}</p>
             </div>
          </div>
        </div>
      </div>
      
      {/* Real-time Integration & Analytics */}
      <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
           <div>
              <p className="text-[10px] font-medium text-zinc-500">Live Projection (From Logs)</p>
           </div>
           <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Live Sync</span>
           </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
           <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Weekly Activity</p>
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{workoutStats.recentCount} <span className="text-[10px] text-zinc-500 font-bold uppercase">Sessions</span></p>
           </div>
           <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Avg Vol</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{Math.round(workoutStats.recentBurn / 7)} <span className="text-[10px] text-zinc-500 font-bold uppercase">Kcal/d</span></p>
           </div>
        </div>

        {targetCalculated ? (
          <div className="p-4 bg-zinc-900 rounded-xl">
             <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dynamic ETA</p>
                <p className="text-sm font-black text-white">{trajectoryWeeks} Wks</p>
             </div>
             <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
               Based on your logged workouts ({workoutStats.recentCount} this week), your total daily deficit is ~{totalDailyDeficit}kcal.
             </p>
          </div>
        ) : profile.targetWeight ? (
          <div className="p-4 bg-zinc-900 rounded-xl">
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Start Logging</p>
             <p className="text-[10px] text-zinc-500 font-medium">Log workouts to see dynamic ETA to {profile.targetWeight}kg.</p>
          </div>
        ) : (
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Set Target</p>
             <button onClick={onSetupRequest} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium">
               Configure Target Weight to see trajectory based on real logs.
             </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
