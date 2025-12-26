import { Habit, DailyLog } from '@/types';
import { getToday, getDaysAgo } from './utils';

interface HealthTip {
  message: string;
  type: 'diet' | 'hydration' | 'sleep' | 'exercise' | 'general';
}

export function generateHealthTip(
  habits: Habit[],
  recentLogs: DailyLog[],
  userGoals?: string
): HealthTip {
  const today = getToday();
  const weekAgo = getDaysAgo(7);
  
  // Analyze hydration habits
  const hydrationHabits = habits.filter(h => 
    h.name.toLowerCase().includes('water') || 
    h.name.toLowerCase().includes('hydration')
  );
  const hydrationCompleted = recentLogs.filter(log => 
    hydrationHabits.some(h => h.id === log.habitId) && 
    log.completed && 
    log.date >= weekAgo
  ).length;
  
  // Analyze exercise habits
  const exerciseHabits = habits.filter(h => 
    h.category === 'Fitness' || 
    h.name.toLowerCase().includes('exercise') ||
    h.name.toLowerCase().includes('workout') ||
    h.name.toLowerCase().includes('gym')
  );
  const exerciseCompleted = recentLogs.filter(log => 
    exerciseHabits.some(h => h.id === log.habitId) && 
    log.completed && 
    log.date >= weekAgo
  ).length;
  
  // Analyze diet habits
  const dietHabits = habits.filter(h => 
    h.category === 'Diet' || 
    h.name.toLowerCase().includes('protein') ||
    h.name.toLowerCase().includes('fiber') ||
    h.name.toLowerCase().includes('meal')
  );
  const dietCompleted = recentLogs.filter(log => 
    dietHabits.some(h => h.id === log.habitId) && 
    log.completed && 
    log.date >= weekAgo
  ).length;
  
  // Generate contextual tips
  const tips: HealthTip[] = [];
  
  // Hydration tips
  if (hydrationHabits.length > 0) {
    if (hydrationCompleted < 4) {
      tips.push({
        message: "💧 You've been hydrating well! Try to maintain 2-3 liters of water daily. Start your morning with a glass of water to kickstart your metabolism.",
        type: 'hydration'
      });
    } else {
      tips.push({
        message: "💧 Great job on staying hydrated! Remember to drink water consistently throughout the day, not just when you're thirsty.",
        type: 'hydration'
      });
    }
  } else {
    tips.push({
      message: "💧 Consider adding a hydration habit! Aim for 2-3 liters of water daily. Proper hydration improves energy, focus, and overall health.",
      type: 'hydration'
    });
  }
  
  // Exercise tips
  if (exerciseHabits.length > 0) {
    if (exerciseCompleted < 3) {
      tips.push({
        message: "🏋️ You're building a great exercise routine! Remember to include both strength training and cardio for optimal health. Rest days are important too!",
        type: 'exercise'
      });
    } else {
      tips.push({
        message: "🏋️ Excellent work on your fitness goals! Consider adding mobility work on rest days to improve flexibility and prevent injury.",
        type: 'exercise'
      });
    }
  } else {
    tips.push({
      message: "🏋️ Regular exercise is key to long-term health. Start with 30 minutes of activity 3-4 times per week. Even a daily walk counts!",
      type: 'exercise'
    });
  }
  
  // Diet tips
  if (dietHabits.length > 0) {
    if (dietCompleted < 5) {
      tips.push({
        message: "🥗 Focus on balanced meals with protein, fiber, and healthy fats. Try meal prepping on weekends to make healthy eating easier during the week.",
        type: 'diet'
      });
    } else {
      tips.push({
        message: "🥗 Great job maintaining a balanced diet! Remember to include a variety of colorful fruits and vegetables for essential vitamins and minerals.",
        type: 'diet'
      });
    }
  } else {
    tips.push({
      message: "🥗 Consider tracking your nutrition! Aim for 0.8-1.2g protein per kg body weight and 25-38g fiber daily. Small, consistent changes lead to big results.",
      type: 'diet'
    });
  }
  
  // General motivation
  const completionRate = recentLogs.filter(log => log.completed).length / Math.max(recentLogs.length, 1);
  if (completionRate > 0.7) {
    tips.push({
      message: "🌟 You're doing amazing! Consistency is key to building lasting habits. Keep up the great work!",
      type: 'general'
    });
  } else if (completionRate > 0.5) {
    tips.push({
      message: "🌟 You're making good progress! Remember, it's okay to miss a day. What matters is getting back on track.",
      type: 'general'
    });
  } else {
    tips.push({
      message: "🌟 Every journey starts with a single step. Focus on completing just one habit today, and build from there.",
      type: 'general'
    });
  }
  
  // Return a random tip from the collection
  return tips[Math.floor(Math.random() * tips.length)];
}

export function generateWorkoutSuggestion(
  recentLogs: DailyLog[],
  habits: Habit[]
): string {
  const today = new Date().getDay();
  const weekAgo = getDaysAgo(7);
  
  const recentWorkouts = recentLogs.filter(log => {
    const habit = habits.find(h => h.id === log.habitId);
    return habit && (habit.category === 'Fitness' || habit.name.toLowerCase().includes('exercise'));
  });
  
  const workoutCount = recentWorkouts.filter(log => log.date >= weekAgo && log.completed).length;
  
  if (workoutCount === 0) {
    return "Start with a 30-minute walk or light stretching. Even 10 minutes of movement counts!";
  } else if (workoutCount < 3) {
    return "Great start! Try adding 2-3 strength training sessions this week. Focus on compound movements like squats, push-ups, and rows.";
  } else if (today === 0 || today === 6) {
    return "Weekend workout: Try a 45-60 minute full-body session or an active recovery day with yoga and light cardio.";
  } else {
    return "You're on a roll! Today would be perfect for a focused strength session. Consider push exercises (chest, shoulders, triceps) or pull exercises (back, biceps).";
  }
}

export function generateDietSuggestion(
  recentLogs: DailyLog[],
  habits: Habit[]
): string {
  const hydrationHabits = habits.filter(h => 
    h.name.toLowerCase().includes('water') || h.name.toLowerCase().includes('hydration')
  );
  const dietHabits = habits.filter(h => h.category === 'Diet');
  
  if (hydrationHabits.length === 0) {
    return "Start your day with a glass of water and aim for 8 glasses throughout the day. Set reminders if needed!";
  }
  
  if (dietHabits.length === 0) {
    return "Focus on balanced meals: include a protein source (chicken, fish, beans), complex carbs (brown rice, quinoa), and vegetables. Meal prep can make this easier!";
  }
  
  return "Try incorporating more fiber-rich foods today: add vegetables to every meal, choose whole grains, and snack on fruits and nuts.";
}

