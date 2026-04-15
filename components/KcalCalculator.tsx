'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Flame, Info, ChevronRight, Save, Dumbbell } from 'lucide-react';

interface HealthProfile {
  age?: number;
  height?: number;
  weight?: number;
  gender?: 'male' | 'female' | 'other';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
  healthGoal?: 'loss' | 'maintain' | 'gain';
  targetWeight?: number;
  avgWorkoutDuration?: number;
  avgWorkoutIntensity?: 'low' | 'medium' | 'high';
}

interface ProjectionData {
  daysToGoal: number;
  weeksToGoal: number;
  macros: { p: number; c: number; f: number };
  professionalAdvice: string;
}

interface KcalCalculatorProps {
  onSave?: (data: any) => void;
  initialData?: HealthProfile;
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

export default function KcalCalculator({ onSave, initialData }: KcalCalculatorProps) {
  const [profile, setProfile] = useState<HealthProfile>(initialData || {});
  const [result, setResult] = useState<{ bmr: number; tdee: number; target: number } | null>(null);
  const [projection, setProjection] = useState<ProjectionData | null>(null);
  const [showForm, setShowForm] = useState(!initialData?.age);

  useEffect(() => {
    calculate();
  }, [profile]);

  const calculate = () => {
    const { age, height, weight, gender, activityLevel, healthGoal } = profile;
    if (!age || !height || !weight || !gender || !activityLevel || !healthGoal) {
      setResult(null);
      return;
    }

    // Mifflin-St Jeor Equation
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender === 'male') bmr += 5;
    else if (gender === 'female') bmr -= 161;
    else bmr -= 78; // average of male/female for 'other'

    const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
    
    let target = tdee;
    if (healthGoal === 'loss') target -= 500;
    else if (healthGoal === 'gain') target += 500;

    setResult({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target: Math.round(target)
    });

    if (profile.targetWeight && profile.avgWorkoutDuration && profile.avgWorkoutIntensity) {
      calculateProjection(bmr, tdee, target, profile.targetWeight, profile.avgWorkoutDuration, profile.avgWorkoutIntensity, profile.healthGoal || 'maintain', weight);
    } else {
      setProjection(null);
    }
  };

  const calculateProjection = (
    bmr: number, 
    tdee: number, 
    target: number, 
    targetWeight: number, 
    duration: number, 
    intensity: string, 
    goal: string,
    currentWeight: number
  ) => {
    // 1 kg of fat/muscle = ~7700 kcal
    const weightDiff = Math.abs(currentWeight - targetWeight);
    const totalKcalNeeded = weightDiff * 7700;

    // Estimate daily calorie difference (food)
    const foodDeficitSurplus = Math.abs(tdee - target);
    
    // Estimate daily workout burn based on intensity and duration
    // Typical burn per minute: Low=5, Med=8, High=12
    const burnPerMin = intensity === 'high' ? 12 : intensity === 'medium' ? 8 : 5;
    const workoutBurnSession = burnPerMin * duration;
    // Assume 4 workouts per week on average for the daily distributed burn
    const dailyWorkoutBurn = (workoutBurnSession * 4) / 7;

    let totalDailyDifference = foodDeficitSurplus;
    if (goal === 'loss') totalDailyDifference += dailyWorkoutBurn;
    else if (goal === 'gain') totalDailyDifference -= dailyWorkoutBurn; // Burn reduces surplus

    // Avoid infinite days if difference is too small
    totalDailyDifference = Math.max(totalDailyDifference, 100);

    const daysToGoal = Math.round(totalKcalNeeded / totalDailyDifference);
    const weeksToGoal = Math.round(daysToGoal / 7);

    // Standard Professional Macros
    let pMultiplier, cPercent, fPercent;
    if (goal === 'loss') {
        pMultiplier = 2.2; // High protein for preservation
        cPercent = 0.35;
        fPercent = 1 - cPercent - ((currentWeight * pMultiplier * 4) / Math.max(target, 1));
    } else if (goal === 'gain') {
        pMultiplier = 1.8;
        cPercent = 0.50;
        fPercent = 1 - cPercent - ((currentWeight * pMultiplier * 4) / Math.max(target, 1));
    } else {
        pMultiplier = 2.0;
        cPercent = 0.40;
        fPercent = 1 - cPercent - ((currentWeight * pMultiplier * 4) / Math.max(target, 1));
    }

    const protein = Math.round(currentWeight * pMultiplier);
    const carbs = Math.round((target * cPercent) / 4);
    const fat = Math.round((target * Math.max(fPercent, 0.2)) / 9);

    const advice = goal === 'loss' 
      ? `Maintained a highly structured deficit integrating ${intensity} intensity intervals. Peak metabolic efficiency mapping indicates core recomposition in ${Math.round(weeksToGoal * 0.7)} weeks.`
      : goal === 'gain' 
        ? `Optimized anabolic surplus incorporating ${intensity} intensity volume. Expected primary muscle hypertrophy milestones in ${Math.round(weeksToGoal * 0.8)} weeks.`
        : `Homeostatic equilibrium maintained through balanced ${intensity} mechanics. Prime conditioning phase active.`;

    setProjection({
      daysToGoal,
      weeksToGoal,
      macros: { p: protein, c: carbs, f: fat },
      professionalAdvice: advice
    });
  };

  const handleUpdate = (field: keyof HealthProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5 bg-indigo-50/50 dark:bg-indigo-500/5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Flame size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Kcal Strategy</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Personalized Fitness Engine</p>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          {showForm ? 'Hide Details' : 'Edit Profile'}
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Age</label>
                  <input 
                    type="number" 
                    value={profile.age || ''} 
                    onChange={(e) => handleUpdate('age', parseInt(e.target.value))}
                    placeholder="yrs"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Height</label>
                  <input 
                    type="number" 
                    value={profile.height || ''} 
                    onChange={(e) => handleUpdate('height', parseInt(e.target.value))}
                    placeholder="cm"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Weight</label>
                  <input 
                    type="number" 
                    value={profile.weight || ''} 
                    onChange={(e) => handleUpdate('weight', parseInt(e.target.value))}
                    placeholder="kg"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Gender</label>
                  <select 
                    value={profile.gender || ''} 
                    onChange={(e) => handleUpdate('gender', e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Goal</label>
                  <select 
                    value={profile.healthGoal || ''} 
                    onChange={(e) => handleUpdate('healthGoal', e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select</option>
                    <option value="loss">Weight Loss</option>
                    <option value="maintain">Maintain</option>
                    <option value="gain">Mass Gain</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Activity Level</label>
                <select 
                  value={profile.activityLevel || ''} 
                  onChange={(e) => handleUpdate('activityLevel', e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select</option>
                  <option value="sedentary">Sedentary (Little to no exercise)</option>
                  <option value="light">Lightly Active (1-3 days/week)</option>
                  <option value="moderate">Moderately Active (3-5 days/week)</option>
                  <option value="very">Very Active (6-7 days/week)</option>
                  <option value="extra">Extra Active (Very intense exercise/job)</option>
                </select>
              </div>

              {/* Advanced Fitness Projections */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                 <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-900 border-l-[3px] border-indigo-500 pl-2">Professional Projections</h4>
                 <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Target Wgt</label>
                      <input 
                        type="number" 
                        value={profile.targetWeight || ''} 
                        onChange={(e) => handleUpdate('targetWeight', parseInt(e.target.value))}
                        placeholder="kg"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Avg Wko Mins</label>
                      <input 
                        type="number" 
                        value={profile.avgWorkoutDuration || ''} 
                        onChange={(e) => handleUpdate('avgWorkoutDuration', parseInt(e.target.value))}
                        placeholder="min"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Intensity</label>
                      <select 
                        value={profile.avgWorkoutIntensity || ''} 
                        onChange={(e) => handleUpdate('avgWorkoutIntensity', e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-1 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Sel</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                 </div>
              </div>

              {onSave && (
                <button 
                  onClick={() => onSave(profile)}
                  className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
                >
                  <Save size={14} /> Save Profile Data
                </button>
              )}
            </motion.div>
          ) : result ? (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-6"
            >
              <div className="text-center group">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-zinc-600 transition-colors">BMR</p>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">{result.bmr}</div>
                <p className="text-[8px] text-zinc-400 font-bold uppercase mt-1">Basal Metabolic</p>
              </div>
              <div className="text-center group">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">Target</p>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{result.target}</div>
                <p className="text-[8px] text-indigo-400 font-bold uppercase mt-1">Daily Kcal Goal</p>
              </div>
              <div className="text-center group">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-zinc-600 transition-colors">TDEE</p>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">{result.tdee}</div>
                <p className="text-[8px] text-zinc-400 font-bold uppercase mt-1">Total Daily Energy</p>
              </div>
            </motion.div>
          ) : (
             <div className="flex flex-col items-center justify-center py-6 text-center">
               <Info size={32} className="text-zinc-200 dark:text-zinc-800 mb-3" />
               <p className="text-sm font-bold text-zinc-500">Complete your profile to see targets</p>
               <button 
                 onClick={() => setShowForm(true)}
                 className="mt-3 text-[10px] font-black uppercase tracking-widest text-indigo-600"
               >
                 Set Up Health Profile
               </button>
             </div>
          )}
        </AnimatePresence>
      </div>

      {result && !showForm && (
        <div className="px-6 pb-6 pt-2">
           <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group cursor-help">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <Dumbbell size={16} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase leading-none">Smart Suggestion</p>
                    <p className="text-[9px] text-zinc-500 font-medium">Based on your {profile.healthGoal} goal</p>
                 </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-tight">Active Plan</p>
                <p className="text-[9px] text-zinc-400 font-bold uppercase">{profile.activityLevel} protocol</p>
              </div>
           </div>

           {projection && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="mt-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800"
             >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                   <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Estimated Timeline</p>
                      <p className="text-xl font-black text-white">{projection.weeksToGoal} <span className="text-sm text-zinc-400">Weeks</span></p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Total Days</p>
                      <p className="text-lg font-bold text-indigo-400">{projection.daysToGoal}</p>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                   <div className="p-2 rounded-xl bg-zinc-800/50 text-center">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Protein</p>
                      <p className="text-sm font-bold text-emerald-400">{projection.macros.p}g</p>
                   </div>
                   <div className="p-2 rounded-xl bg-zinc-800/50 text-center">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Carbs</p>
                      <p className="text-sm font-bold text-amber-400">{projection.macros.c}g</p>
                   </div>
                   <div className="p-2 rounded-xl bg-zinc-800/50 text-center">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Fats</p>
                      <p className="text-sm font-bold text-rose-400">{projection.macros.f}g</p>
                   </div>
                </div>

                <div className="p-3 bg-zinc-800/80 rounded-xl">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 text-center">Professional Protocol</p>
                   <p className="text-[11px] font-medium text-zinc-300 leading-relaxed text-center">
                      "{projection.professionalAdvice}"
                   </p>
                </div>
             </motion.div>
           )}
        </div>
      )}
    </div>
  );
}
