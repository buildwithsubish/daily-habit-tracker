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

  // --- 6. MILESTONE & SPECIAL ---
  achievements.push(createAchievement(
    'special-first', 'First Habit', 'Created your first habit.', '🌱', 'Bronze', 5, 'Milestone & Special',
    { achieved: habits.length > 0 }
  ));

  // Speed Demon (Hidden: 10 habits in one hour)
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

  // --- 7. NEW: CALENDAR & CONSISTENCY ---
  // Perfect Week: All habits completed for 7 days (Simplified to 7 consecutive days with at least one completion each day)
  achievements.push(createAchievement(
    'cons-perfect-week', 'Perfect Week', 'At least one habit completed every day for 7 days.', '📅', 'Silver', 30, 'Consistency',
    { achieved: maxStreak >= 7, progress: Math.min(100, (maxStreak / 7) * 100), currentValue: maxStreak, targetValue: 7 }
  ));

  // Weekend Warrior: Complete habits on both Saturday and Sunday
  const weekendLogs = logs.filter(l => {
    if (!l.completed) return false;
    const date = new Date(l.date);
    const day = date.getDay();
    return day === 0 || day === 6;
  });
  const hasWeekendActivity = new Set(weekendLogs.map(l => l.date)).size >= 2;
  achievements.push(createAchievement(
    'special-warrior', 'Weekend Warrior', 'Stay consistent through the weekend.', '⚔️', 'Bronze', 15, 'Milestone & Special',
    { achieved: hasWeekendActivity }
  ));

  // --- 8. NEW: FITNESS & GYM ---
  const fitnessKeywords = ['gym', 'workout', 'exercise', 'lift', 'run', 'cardio', 'strength', 'fitness', 'training', 'yoga'];
  const fitnessHabits = habits.filter(h => fitnessKeywords.some(k => h.name.toLowerCase().includes(k)));
  const fitnessLogs = logs.filter(l => l.completed && fitnessHabits.some(h => h.id === l.habitId));
  const totalFitnessCompletions = fitnessLogs.length;

  // Gym Rat: 20 fitness-related completions
  achievements.push(createAchievement(
    'fit-rat', 'Gym Rat', 'Complete 20 fitness-focused habit logs.', '🏋️', 'Silver', 45, 'Diversity',
    { achieved: totalFitnessCompletions >= 20, progress: Math.min(100, (totalFitnessCompletions / 20) * 100), currentValue: totalFitnessCompletions, targetValue: 20 }
  ));

  // Iron Grip: 50 fitness completions (Gold)
  achievements.push(createAchievement(
    'fit-iron', 'Iron Grip', 'Complete 50 fitness-focused habit logs.', '🦾', 'Gold', 120, 'Consistency',
    { achieved: totalFitnessCompletions >= 50, progress: Math.min(100, (totalFitnessCompletions / 50) * 100), currentValue: totalFitnessCompletions, targetValue: 50 }
  ));

  // Marathoner: 100 fitness completions (Platinum)
  achievements.push(createAchievement(
    'fit-marathon', 'Marathoner', 'Complete 100 fitness-focused habit logs.', '🏃', 'Platinum', 250, 'Consistency',
    { achieved: totalFitnessCompletions >= 100, progress: Math.min(100, (totalFitnessCompletions / 100) * 100), currentValue: totalFitnessCompletions, targetValue: 100 }
  ));

  // Fitness Scientist: Log habits with body weight or reps in notes
  const physicalNotes = logs.filter(l => l.activityNote && (l.activityNote.includes('kg') || l.activityNote.toLowerCase().includes('reps'))).length;
  achievements.push(createAchievement(
    'fit-scientist', 'Fitness Scientist', 'Record 10 logs with weight (kg) or reps in notes.', '🧪', 'Silver', 60, 'Milestone & Special',
    { achieved: physicalNotes >= 10, progress: Math.min(100, (physicalNotes / 10) * 100), currentValue: physicalNotes, targetValue: 10 }
  ));

  return achievements;
};
