import connectDB from './mongodb';
import Preset from './models/Preset';

export async function initPresets() {
  await connectDB();

  const presets = [
    {
      name: 'Morning Routine',
      type: 'morning-routine',
      description: 'Start your day with intention. A focused morning routine sets the tone for everything else.',
      category: 'Health',
      structure: {
        habits: [
          { name: 'Wake Up Early', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Get out of bed at your target time' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Drink Water', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Drink a glass of water first thing' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Stretch or Light Exercise', category: 'Health', type: 'single-step', steps: [{ order: 0, name: '10 minutes of movement' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Plan Your Day', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Review your to-do list and priorities' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Daily Exercise',
      type: 'daily-exercise',
      description: 'Stay active every day with a balanced mix of cardio, strength, and mobility work.',
      category: 'Fitness',
      structure: {
        habits: [
          { name: 'Move Your Body', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: '30 minutes of exercise' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Take the Stairs', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: 'Choose stairs over elevator when possible' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Walk After Meals', category: 'Health', type: 'single-step', steps: [{ order: 0, name: '5-10 minute walk after lunch or dinner' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Better Sleep',
      type: 'better-sleep',
      description: 'Improve your sleep quality with consistent evening habits.',
      category: 'Health',
      structure: {
        habits: [
          { name: 'No Screens Before Bed', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Stop screen time 1 hour before bed' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Read a Book', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Read for 20 minutes before sleep' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Wind Down Routine', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Dim lights, prepare bedroom' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Consistent Bedtime', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Go to bed at your target time' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Productivity Power',
      type: 'productivity',
      description: 'Maximize your focus and get more done with proven productivity techniques.',
      category: 'Productivity',
      structure: {
        habits: [
          { name: 'Deep Work Session', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: '45-90 minutes of focused work' }], schedule: { weekdays: true, weekends: false } },
          { name: 'Eat the Frog', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Do your most important task first' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Take Regular Breaks', category: 'Health', type: 'single-step', steps: [{ order: 0, name: '5 min break every 25-50 min' }], schedule: { weekdays: true, weekends: false } },
          { name: 'End of Day Review', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Review what you accomplished' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Mindfulness & Calm',
      type: 'mindfulness',
      description: 'Reduce stress and find inner peace with daily mindfulness practices.',
      category: 'Mindfulness',
      structure: {
        habits: [
          { name: 'Morning Meditation', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: '10-15 minutes of meditation' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Practice Gratitude', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Write down 3 things you are grateful for' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Deep Breathing', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: '5 minutes of breathing exercises' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Digital Detox', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Take a break from social media' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Healthy Eating',
      type: 'healthy-eating',
      description: 'Build better eating habits one day at a time.',
      category: 'Health',
      structure: {
        habits: [
          { name: 'Eat More Vegetables', category: 'Diet', type: 'single-step', steps: [{ order: 0, name: 'Include vegetables in every meal' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Limit Sugar', category: 'Diet', type: 'single-step', steps: [{ order: 0, name: 'Reduce sugary snacks and drinks' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Meal Prep', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Prepare meals for the day ahead' }], schedule: { weekdays: true, weekends: false } },
          { name: 'Eat Mindfully', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Eat without distractions' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Learning & Growth',
      type: 'learning',
      description: 'Never stop learning and growing your skills.',
      category: 'Growth',
      structure: {
        habits: [
          { name: 'Read Every Day', category: 'Growth', type: 'single-step', steps: [{ order: 0, name: 'Read for 20-30 minutes' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Learn Something New', category: 'Growth', type: 'single-step', steps: [{ order: 0, name: 'Study a new skill or topic' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Listen to Podcast', category: 'Growth', type: 'single-step', steps: [{ order: 0, name: 'Listen while commuting or exercising' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Practice Skill', category: 'Growth', type: 'single-step', steps: [{ order: 0, name: 'Deliberate practice for 30 minutes' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Financial Health',
      type: 'financial',
      description: 'Build wealth and manage money wisely.',
      category: 'Growth',
      structure: {
        habits: [
          { name: 'Track Spending', category: 'Finance', type: 'single-step', steps: [{ order: 0, name: 'Log all expenses for the day' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Save Money', category: 'Finance', type: 'single-step', steps: [{ order: 0, name: 'Put money into savings' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Review Budget', category: 'Finance', type: 'single-step', steps: [{ order: 0, name: 'Check your spending against budget' }], schedule: { weekdays: true, weekends: true } },
          { name: 'No Spend Day', category: 'Finance', type: 'single-step', steps: [{ order: 0, name: 'Spend nothing unnecessary' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Social Connections',
      type: 'social',
      description: 'Nurture relationships and build a stronger network.',
      category: 'Mindfulness',
      structure: {
        habits: [
          { name: 'Reach Out to Someone', category: 'Social', type: 'single-step', steps: [{ order: 0, name: 'Call or message a friend/family' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Express Appreciation', category: 'Social', type: 'single-step', steps: [{ order: 0, name: 'Tell someone you appreciate them' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Quality Time', category: 'Social', type: 'single-step', steps: [{ order: 0, name: 'Spend time with loved ones' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Weekend Reset',
      type: 'weekend-reset',
      description: 'Make the most of your weekends with rest and preparation.',
      category: 'Productivity',
      structure: {
        habits: [
          { name: 'Weekly Review', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Review last week and plan next' }], schedule: { weekdays: false, weekends: true } },
          { name: 'Meal Prep', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Prepare meals for the week' }], schedule: { weekdays: false, weekends: true } },
          { name: 'Get Outside', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Spend time in nature' }], schedule: { weekdays: false, weekends: true } },
          { name: 'Rest and Recharge', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Do something you enjoy' }], schedule: { weekdays: false, weekends: true } }
        ]
      }
    }
  ];

  for (const preset of presets) {
    await Preset.findOneAndUpdate(
      { type: preset.type },
      preset,
      { upsert: true, new: true }
    );
  }
}

