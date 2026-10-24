import { Habit, DailyLog, Achievement, AchievementTier, AchievementCategory } from '@/types';

export const calculateAchievements = (habits: Habit[], logs: DailyLog[]): Achievement[] => {
  const achievements: Achievement[] = [];

  // Helper to create achievement object
  const createAchievement = (
    id: string,
    title: string,
    description: string,
    icon: string,
    tier: AchievementTier,
    points: number,
    category: AchievementCategory,
    criteria: { achieved: boolean; progress?: number; currentValue?: number; targetValue?: number },
    hidden: boolean = false
  ): Achievement => ({
    id,
    title,
    description,
    icon,
    tier,
    points,
    category,
    hidden,
    ...criteria,
  });

  // --- 1. STREAK ACHIEVEMENTS ---
  const maxStreak = Math.max(0, ...habits.map(h => h.streak || 0));
  
  achievements.push(createAchievement(
    'streak-3', 'Getting Started', 'Maintain any habit for 3 consecutive days.', '🔥', 'Bronze', 10, 'Streak',
    { achieved: maxStreak >= 3, progress: Math.min(100, (maxStreak / 3) * 100), currentValue: maxStreak, targetValue: 3 }
  ));

  achievements.push(createAchievement(
    'streak-30', 'Monthly Master', 'Maintained a habit for 30 consecutive days.', '🏆', 'Gold', 100, 'Streak',
    { achieved: maxStreak >= 30, progress: Math.min(100, (maxStreak / 30) * 100), currentValue: maxStreak, targetValue: 30 }
  ));

  achievements.push(createAchievement(
    'streak-365', 'Year of Excellence', 'Maintained a habit for an entire year!', '👑', 'Legendary', 1000, 'Streak',
    { achieved: maxStreak >= 365, progress: Math.min(100, (maxStreak / 365) * 100), currentValue: maxStreak, targetValue: 365 }
  ));

  // --- 2. COMPLETION ACHIEVEMENTS ---
  const totalCompletions = logs.filter(l => l.completed).length;

  achievements.push(createAchievement(
    'comp-50', 'Getting Serious', 'Complete 50 total habit activities.', '📈', 'Bronze', 25, 'Completion',
    { achieved: totalCompletions >= 50, progress: Math.min(100, (totalCompletions / 50) * 100), currentValue: totalCompletions, targetValue: 50 }
  ));

  achievements.push(createAchievement(
    'comp-1000', 'Thousand Club', 'Complete 1,000 total habit activities.', '💎', 'Platinum', 200, 'Completion',
    { achieved: totalCompletions >= 1000, progress: Math.min(100, (totalCompletions / 1000) * 100), currentValue: totalCompletions, targetValue: 1000 }
  ));

  achievements.push(createAchievement(
    'comp-10000', 'Immortal Legend', 'Complete 10,000 total habit activities.', '🌌', 'Legendary', 1500, 'Completion',
    { achieved: totalCompletions >= 10000, progress: Math.min(100, (totalCompletions / 10000) * 100), currentValue: totalCompletions, targetValue: 10000 }
  ));

  // --- 3. TIME-BASED ACHIEVEMENTS ---
  const earlyBird = logs.some(l => l.completed && l.completedAt && new Date(l.completedAt).getHours() < 8);
  const nightOwl = logs.some(l => l.completed && l.completedAt && new Date(l.completedAt).getHours() >= 22);
  const lunchLegend = logs.some(l => {
    if (!l.completed || !l.completedAt) return false;
    const hour = new Date(l.completedAt).getHours();
    return hour >= 12 && hour < 13;
  });

  achievements.push(createAchievement(
    'time-early', 'Early Bird', 'Complete a habit before 8 AM.', '🌅', 'Silver', 15, 'Time-Based',
    { achieved: earlyBird }
  ));

  achievements.push(createAchievement(
    'time-late', 'Night Owl', 'Complete a habit after 10 PM.', '🌙', 'Silver', 15, 'Time-Based',
    { achieved: nightOwl }
  ));

  achievements.push(createAchievement(
    'time-lunch', 'Lunch Break Legend', 'Complete a habit during the 12-1 PM lunch hour.', '🥗', 'Bronze', 10, 'Time-Based',
    { achieved: lunchLegend }
  ));

  // --- 4. DIVERSITY ACHIEVEMENTS ---
  const completedHabitIds = Array.from(new Set(logs.filter(l => l.completed).map(l => l.habitId)));
  const completedHabits = habits.filter(h => completedHabitIds.includes(h.id));
  const uniqueCategories = new Set(completedHabits.map(h => h.category)).size;
  const uniqueTypes = new Set(completedHabits.map(h => h.type)).size;

  achievements.push(createAchievement(
    'div-versatile', 'Versatile', 'Complete habits across 5 different categories.', '🎨', 'Bronze', 20, 'Diversity',
    { achieved: uniqueCategories >= 5, progress: Math.min(100, (uniqueCategories / 5) * 100), currentValue: uniqueCategories, targetValue: 5 }
  ));

  achievements.push(createAchievement(
    'div-rounded', 'Well-Rounded', 'Engage with 8+ different categories of habits.', '🌐', 'Platinum', 60, 'Diversity',
    { achieved: uniqueCategories >= 8, progress: Math.min(100, (uniqueCategories / 8) * 100), currentValue: uniqueCategories, targetValue: 8 }
  ));

  // --- 5. CONSISTENCY ACHIEVEMENTS ---
  // Simple check for No Zero Days (30 days of at least one completion)
  const daysWithCompletions = Array.from(new Set(logs.filter(l => l.completed).map(l => l.date))).length;
  achievements.push(createAchievement(
    'cons-no-zero', 'No Zero Days', 'Have at least one habit completion on 30 unique days.', '⛓️', 'Gold', 75, 'Consistency',
    { achieved: daysWithCompletions >= 30, progress: Math.min(100, (daysWithCompletions / 30) * 100), currentValue: daysWithCompletions, targetValue: 30 }
  ));

  // Iron Will (Placeholder for complex 3-month logic, simplified to 90 total unique days of any activity)
  achievements.push(createAchievement(
    'cons-iron-will', 'Iron Will', 'Maintain activity for 90 unique days.', '🦾', 'Diamond', 200, 'Consistency',
    { achieved: daysWithCompletions >= 90, progress: Math.min(100, (daysWithCompletions / 90) * 100), currentValue: daysWithCompletions, targetValue: 90 }
  ));

  // --- 6. MILESTONE & SPECIAL ACHIEVEMENTS ---
  const activeHabitsCount = habits.filter(h => h.active !== false).length;

  // 1. First Habit
  achievements.push(createAchievement(
    'special-first', 'First Habit', 'Created your first habit or ritual.', '🌱', 'Bronze', 10, 'Milestone & Special',
    { achieved: habits.length > 0, progress: habits.length > 0 ? 100 : 0, currentValue: Math.min(1, habits.length), targetValue: 1 }
  ));

  // 2. Routine Architect (5+ habits)
  achievements.push(createAchievement(
    'special-pioneer', 'Routine Architect', 'Design and maintain 5 or more active habits.', '🏗️', 'Silver', 25, 'Milestone & Special',
    { achieved: activeHabitsCount >= 5, progress: Math.min(100, (activeHabitsCount / 5) * 100), currentValue: activeHabitsCount, targetValue: 5 }
  ));

  // 3. Habit Master (10+ habits)
  achievements.push(createAchievement(
    'special-master-architect', 'Habit Master', 'Curate 10 or more active habits across your routine.', '🏛️', 'Gold', 60, 'Milestone & Special',
    { achieved: activeHabitsCount >= 10, progress: Math.min(100, (activeHabitsCount / 10) * 100), currentValue: activeHabitsCount, targetValue: 10 }
  ));

  // 4. 7-Day Breakthrough
  achievements.push(createAchievement(
    'special-streak-7', '7-Day Breakthrough', 'Build momentum with an unbroken 7-day streak on any habit.', '⚡', 'Bronze', 20, 'Milestone & Special',
    { achieved: maxStreak >= 7, progress: Math.min(100, (maxStreak / 7) * 100), currentValue: maxStreak, targetValue: 7 }
  ));

  // 5. Two-Week Discipline
  achievements.push(createAchievement(
    'special-streak-14', 'Two-Week Discipline', 'Hold an unbroken 14-day streak on any habit.', '🔥', 'Silver', 40, 'Milestone & Special',
    { achieved: maxStreak >= 14, progress: Math.min(100, (maxStreak / 14) * 100), currentValue: maxStreak, targetValue: 14 }
  ));

  // 6. 21-Day Habit Formation (Scientific Threshold)
  achievements.push(createAchievement(
    'special-streak-21', 'Habit Formation', 'Maintain a 21-day streak — the scientific threshold for neurological habit formation.', '🧠', 'Gold', 80, 'Milestone & Special',
    { achieved: maxStreak >= 21, progress: Math.min(100, (maxStreak / 21) * 100), currentValue: maxStreak, targetValue: 21 }
  ));

  // 7. 66-Day Automaticity Master
  achievements.push(createAchievement(
    'special-streak-66', 'Automaticity Master', 'Reach a 66-day streak — where daily actions become pure automaticity.', '🎯', 'Platinum', 150, 'Milestone & Special',
    { achieved: maxStreak >= 66, progress: Math.min(100, (maxStreak / 66) * 100), currentValue: maxStreak, targetValue: 66 }
  ));

  // 8. 100-Day Centurion Streak
  achievements.push(createAchievement(
    'special-streak-100', 'Centurion Streak', 'Maintain an unbroken 100-day streak on a single habit.', '👑', 'Diamond', 300, 'Milestone & Special',
    { achieved: maxStreak >= 100, progress: Math.min(100, (maxStreak / 100) * 100), currentValue: maxStreak, targetValue: 100 }
  ));

  // 9. Century Milestone (100 total completions)
  achievements.push(createAchievement(
    'special-century', 'Century Milestone', 'Log 100 cumulative habit completions across all rituals.', '💯', 'Silver', 50, 'Milestone & Special',
    { achieved: totalCompletions >= 100, progress: Math.min(100, (totalCompletions / 100) * 100), currentValue: totalCompletions, targetValue: 100 }
  ));

  // 10. Half-K Milestone (500 total completions)
  achievements.push(createAchievement(
    'special-500', 'Half-K Milestone', 'Surpass 500 total habit check-ins.', '💎', 'Gold', 150, 'Milestone & Special',
    { achieved: totalCompletions >= 500, progress: Math.min(100, (totalCompletions / 500) * 100), currentValue: totalCompletions, targetValue: 500 }
  ));

  // 11. Flawless Routine (Check if any day has at least 2 completions)
  const completionsPerDate = new Map<string, number>();
  logs.filter(l => l.completed).forEach(l => {
    completionsPerDate.set(l.date, (completionsPerDate.get(l.date) || 0) + 1);
  });
  const maxDayCompletions = Math.max(0, ...Array.from(completionsPerDate.values()));
  const hasFlawlessDay = maxDayCompletions >= Math.min(3, Math.max(1, habits.length));

  achievements.push(createAchievement(
    'special-perfect-day', 'Flawless Routine', 'Complete all scheduled rituals for a full productive day.', '🌟', 'Silver', 35, 'Milestone & Special',
    { achieved: hasFlawlessDay, progress: hasFlawlessDay ? 100 : Math.min(100, (maxDayCompletions / Math.max(1, Math.min(3, habits.length))) * 100) }
  ));

  // 12. Weekend Warrior: Complete habits on both Saturday and Sunday
  const weekendLogs = logs.filter(l => {
    if (!l.completed) return false;
    const date = new Date(l.date);
    const day = date.getDay();
    return day === 0 || day === 6;
  });
  const hasWeekendActivity = new Set(weekendLogs.map(l => l.date)).size >= 2;
  achievements.push(createAchievement(
    'special-warrior', 'Weekend Warrior', 'Stay consistent through both Saturday and Sunday.', '⚔️', 'Bronze', 20, 'Milestone & Special',
    { achieved: hasWeekendActivity }
  ));

  // 13. Speed Demon (Hidden: 10 habits in one hour)
  let speedDemon = false;
  const sortedLogs = logs
    .filter(l => l.completed && l.completedAt)
    .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

  for (let i = 0; i < sortedLogs.length - 9; i++) {
    const start = new Date(sortedLogs[i].completedAt!).getTime();
    const end = new Date(sortedLogs[i + 9].completedAt!).getTime();
    if (end - start <= 3600000) { // 1 hour in ms
      speedDemon = true;
      break;
    }
  }

  achievements.push(createAchievement(
    'special-speed', 'Speed Demon', 'Complete 10 habits in a single hour.', '⚡', 'Platinum', 100, 'Milestone & Special',
    { achieved: speedDemon, progress: speedDemon ? 100 : 0 },
    true // Hidden
  ));

  // --- 8. FITNESS & GYM ACHIEVEMENTS ---
  const fitnessKeywords = ['gym', 'workout', 'exercise', 'lift', 'run', 'cardio', 'strength', 'fitness', 'training', 'yoga', 'push', 'pull', 'legs', 'bench', 'squat', 'deadlift', 'ppl'];
  const fitnessHabits = habits.filter(h => {
    const name = (h.name || '').toLowerCase();
    const cat = (h.category || '').toLowerCase();
    return cat === 'fitness' || cat === 'health' || fitnessKeywords.some(k => name.includes(k)) || (h.type && h.type.includes('gym'));
  });
  const fitnessHabitIds = new Set(fitnessHabits.map(h => h.id));
  const fitnessLogs = logs.filter(l => l.completed && (fitnessHabitIds.has(l.habitId) || l.workoutData != null));
  const totalFitnessCompletions = fitnessLogs.length;
  const maxGymStreak = Math.max(0, ...fitnessHabits.map(h => h.streak || 0));

  // Exercise splits: Push / Pull / Legs analysis
  const pushKeywords = ['push', 'chest', 'bench', 'shoulder', 'tricep', 'overhead press', 'ohp', 'incline', 'dip'];
  const pullKeywords = ['pull', 'back', 'row', 'lat', 'pulldown', 'bicep', 'deadlift', 'pullup', 'chinup', 'curl'];
  const legKeywords = ['leg', 'squat', 'quad', 'hamstring', 'calf', 'calves', 'lunge', 'press', 'hack', 'rdl'];

  const matchesSplit = (log: DailyLog, keywords: string[]) => {
    const habit = habits.find(h => h.id === log.habitId);
    const habitName = (habit?.name || '').toLowerCase();
    const note = (log.activityNote || '').toLowerCase();
    const exNames = (log.workoutData?.exercises || []).map(e => (e.name || '').toLowerCase()).join(' ');
    const fullText = `${habitName} ${note} ${exNames}`;
    return keywords.some(k => fullText.includes(k));
  };

  const hasPushWorkout = fitnessLogs.some(l => matchesSplit(l, pushKeywords));
  const hasPullWorkout = fitnessLogs.some(l => matchesSplit(l, pullKeywords));
  const hasLegWorkout = fitnessLogs.some(l => matchesSplit(l, legKeywords));

  // PPL Trifecta check (in any 7-day rolling window, at least 1 push, 1 pull, 1 legs)
  let hasPPLTrifecta = false;
  const sortedFitnessDates = Array.from(new Set(fitnessLogs.map(l => l.date))).sort();
  for (let i = 0; i < sortedFitnessDates.length; i++) {
    const windowStart = new Date(sortedFitnessDates[i]);
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + 7);
    const windowLogs = fitnessLogs.filter(l => {
      const d = new Date(l.date);
      return d >= windowStart && d <= windowEnd;
    });
    if (
      windowLogs.some(l => matchesSplit(l, pushKeywords)) &&
      windowLogs.some(l => matchesSplit(l, pullKeywords)) &&
      windowLogs.some(l => matchesSplit(l, legKeywords))
    ) {
      hasPPLTrifecta = true;
      break;
    }
  }

  // Weight and Volume calculations
  let maxLoggedWeight = 0;
  let maxSetsInWorkout = 0;
  let detailedWorkoutCount = 0;

  fitnessLogs.forEach(l => {
    let setsCount = 0;
    let hasDetails = false;

    if (l.workoutData?.exercises && l.workoutData.exercises.length > 0) {
      hasDetails = true;
      l.workoutData.exercises.forEach(ex => {
        (ex.sets || []).forEach(s => {
          setsCount++;
          if (s.weight && s.weight > maxLoggedWeight) {
            maxLoggedWeight = s.weight;
          }
        });
      });
    }

    if (l.activityNote) {
      const note = l.activityNote.toLowerCase();
      if (note.includes('kg') || note.includes('reps') || note.includes('sets') || note.includes('lbs')) {
        hasDetails = true;
      }
      const weightMatches = note.matchAll(/(\d{2,3})\s*(?:kg|kilos|lbs)/gi);
      for (const m of weightMatches) {
        let wt = parseFloat(m[1]);
        if (m[0].toLowerCase().includes('lbs')) wt = Math.round(wt * 0.453592);
        if (wt > maxLoggedWeight) maxLoggedWeight = wt;
      }
    }

    if (setsCount > maxSetsInWorkout) maxSetsInWorkout = setsCount;
    if (hasDetails) detailedWorkoutCount++;
  });

  // Early dawn workout
  const hasDawnGym = fitnessLogs.some(l => {
    if (!l.completedAt) return false;
    const hour = new Date(l.completedAt).getHours();
    return hour < 8;
  });

  // Weekend gym
  const hasWeekendGym = fitnessLogs.some(l => {
    const day = new Date(l.date).getDay();
    return day === 0 || day === 6;
  });

  // Smart Recovery / Deload
  const recoveryKeywords = ['recovery', 'deload', 'mobility', 'stretch', 'yoga', 'walk', 'foam roll', 'massage'];
  const hasRecoveryDay = logs.some(l => {
    if (!l.completed) return false;
    const habit = habits.find(h => h.id === l.habitId);
    const text = `${habit?.name || ''} ${l.activityNote || ''}`.toLowerCase();
    return recoveryKeywords.some(k => text.includes(k));
  });

  // 3 workouts in a single week
  let hasThreeInAWeek = false;
  for (let i = 0; i < sortedFitnessDates.length; i++) {
    const start = new Date(sortedFitnessDates[i]);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const countInWeek = sortedFitnessDates.filter(dStr => {
      const d = new Date(dStr);
      return d >= start && d <= end;
    }).length;
    if (countInWeek >= 3) {
      hasThreeInAWeek = true;
      break;
    }
  }

  // 1. First Rep
  achievements.push(createAchievement(
    'gym-first-rep', 'First Rep', 'Log your first gym or fitness workout session.', '🏋️', 'Bronze', 15, 'Fitness & Gym',
    { achieved: totalFitnessCompletions >= 1, progress: Math.min(100, totalFitnessCompletions * 100), currentValue: totalFitnessCompletions, targetValue: 1 }
  ));

  // 2. Iron Week (3 workouts in 7 days)
  achievements.push(createAchievement(
    'gym-consistent-week', 'Iron Week', 'Complete at least 3 workout sessions within a 7-day period.', '🗓️', 'Bronze', 30, 'Fitness & Gym',
    { achieved: hasThreeInAWeek }
  ));

  // 3. Discipline Over Motivation (Streak >= 5)
  achievements.push(createAchievement(
    'gym-streak-5', 'Discipline Over Motivation', 'Maintain a 5-session consistency streak on gym and fitness habits.', '🔥', 'Silver', 50, 'Fitness & Gym',
    { achieved: maxGymStreak >= 5, progress: Math.min(100, (maxGymStreak / 5) * 100), currentValue: maxGymStreak, targetValue: 5 }
  ));

  // 4. Gym Rat (20 workouts)
  achievements.push(createAchievement(
    'fit-rat', 'Gym Rat', 'Complete 20 gym or fitness workout sessions.', '💪', 'Silver', 60, 'Fitness & Gym',
    { achieved: totalFitnessCompletions >= 20, progress: Math.min(100, (totalFitnessCompletions / 20) * 100), currentValue: totalFitnessCompletions, targetValue: 20 }
  ));

  // 5. Iron Grip (50 workouts)
  achievements.push(createAchievement(
    'fit-iron', 'Iron Grip', 'Complete 50 gym or fitness workout sessions.', '🦾', 'Gold', 120, 'Fitness & Gym',
    { achieved: totalFitnessCompletions >= 50, progress: Math.min(100, (totalFitnessCompletions / 50) * 100), currentValue: totalFitnessCompletions, targetValue: 50 }
  ));

  // 6. Century Lifter (100 workouts)
  achievements.push(createAchievement(
    'fit-marathon', 'Century Lifter', 'Log 100 lifetime gym and fitness workout sessions.', '🏆', 'Platinum', 300, 'Fitness & Gym',
    { achieved: totalFitnessCompletions >= 100, progress: Math.min(100, (totalFitnessCompletions / 100) * 100), currentValue: totalFitnessCompletions, targetValue: 100 }
  ));

  // 7. Iron Titan (250 workouts)
  achievements.push(createAchievement(
    'gym-titan', 'Iron Titan', 'Ascend to elite status with 250 logged gym sessions.', '👑', 'Legendary', 1000, 'Fitness & Gym',
    { achieved: totalFitnessCompletions >= 250, progress: Math.min(100, (totalFitnessCompletions / 250) * 100), currentValue: totalFitnessCompletions, targetValue: 250 }
  ));

  // 8. Push Day Master
  achievements.push(createAchievement(
    'gym-push-master', 'Push Day Master', 'Complete a dedicated Push workout (Chest, Shoulders, or Triceps).', '💥', 'Bronze', 25, 'Fitness & Gym',
    { achieved: hasPushWorkout }
  ));

  // 9. Back & Biceps Forge (Pull)
  achievements.push(createAchievement(
    'gym-pull-master', 'Back & Biceps Forge', 'Complete a dedicated Pull workout (Back, Rows, Lat Pulldown, or Biceps).', '🧗', 'Bronze', 25, 'Fitness & Gym',
    { achieved: hasPullWorkout }
  ));

  // 10. Never Skip Leg Day
  achievements.push(createAchievement(
    'gym-leg-master', 'Never Skip Leg Day', 'Complete a dedicated Leg workout (Squats, Hamstrings, or Calves).', '🦵', 'Silver', 40, 'Fitness & Gym',
    { achieved: hasLegWorkout }
  ));

  // 11. PPL Trifecta
  achievements.push(createAchievement(
    'gym-ppl-trifecta', 'PPL Trifecta', 'Complete all 3 core splits (Push, Pull, and Legs) within a 7-day period.', '🔱', 'Gold', 100, 'Fitness & Gym',
    { achieved: hasPPLTrifecta }
  ));

  // 12. The 50kg Club
  achievements.push(createAchievement(
    'gym-club-50kg', 'The 50kg Club', 'Log any exercise set or lift with 50kg (110 lbs) or above.', '🛡️', 'Silver', 45, 'Fitness & Gym',
    { achieved: maxLoggedWeight >= 50, progress: Math.min(100, (maxLoggedWeight / 50) * 100), currentValue: maxLoggedWeight, targetValue: 50 }
  ));

  // 13. The 100kg Club
  achievements.push(createAchievement(
    'gym-century-100kg', 'The 100kg Club', 'Log a compound lift or exercise set with 100kg (225 lbs) or above.', '⚡', 'Gold', 150, 'Fitness & Gym',
    { achieved: maxLoggedWeight >= 100, progress: Math.min(100, (maxLoggedWeight / 100) * 100), currentValue: maxLoggedWeight, targetValue: 100 }
  ));

  // 14. High-Volume Beast
  achievements.push(createAchievement(
    'gym-volume-beast', 'High-Volume Beast', 'Log 15 or more total sets in a single workout session.', '📊', 'Gold', 80, 'Fitness & Gym',
    { achieved: maxSetsInWorkout >= 15, progress: Math.min(100, (maxSetsInWorkout / 15) * 100), currentValue: maxSetsInWorkout, targetValue: 15 }
  ));

  // 15. Dawn Lifter
  achievements.push(createAchievement(
    'gym-dawn-lifter', 'Dawn Lifter', 'Crush a gym workout before 8:00 AM.', '🌅', 'Silver', 35, 'Fitness & Gym',
    { achieved: hasDawnGym }
  ));

  // 16. Weekend Iron
  achievements.push(createAchievement(
    'gym-weekend-iron', 'Weekend Iron', 'Stay relentless and hit the gym on a Saturday or Sunday.', '⚔️', 'Bronze', 20, 'Fitness & Gym',
    { achieved: hasWeekendGym }
  ));

  // 17. Fitness Scientist (Detailed logging)
  achievements.push(createAchievement(
    'fit-scientist', 'Fitness Scientist', 'Record 10 gym logs with explicit weights (kg), reps, or exercise tracking.', '🧪', 'Silver', 60, 'Fitness & Gym',
    { achieved: detailedWorkoutCount >= 10, progress: Math.min(100, (detailedWorkoutCount / 10) * 100), currentValue: detailedWorkoutCount, targetValue: 10 }
  ));

  // 18. Smart Recovery & Deload
  achievements.push(createAchievement(
    'gym-smart-recovery', 'Smart Recovery & Deload', 'Log an active recovery, mobility, or deload day to sustain long-term growth.', '🧘', 'Bronze', 20, 'Fitness & Gym',
    { achieved: hasRecoveryDay }
  ));

  return achievements;
};
