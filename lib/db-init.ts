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
      category: 'Finance',
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
      category: 'Social',
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
    },
    {
      name: '1-Year PPL Hypertrophy & Lean Bulk Protocol',
      type: 'gym-ppl-protocol',
      description: 'Complete 6-day Push/Pull/Legs periodized hypertrophy routine with core finishers, active recovery, and 2,220 kcal lean bulk nutrition plan.',
      category: 'Fitness',
      structure: {
        habits: [
          {
            name: 'Day 1: Push A (Heavy Chest, Shoulders, Triceps)',
            category: 'Fitness',
            type: 'multi-step',
            schedule: { weekdays: false, weekends: false, custom: [1] },
            advancedMode: true,
            description: 'Heavy Push day focusing on progressive compound overload and shoulder development.',
            descriptionEnabled: true,
            steps: [
              { order: 0, name: '1. Flat Dumbbell or Barbell Bench Press: 4 × 6–8' },
              { order: 1, name: '2. Incline Dumbbell Press: 3 × 8–10' },
              { order: 2, name: '3. Seated Dumbbell Overhead Press: 3 × 8–10' },
              { order: 3, name: '4. Cable Lateral Raises: 4 × 12–15' },
              { order: 4, name: '5. Overhead Dumbbell/Cable Tricep Extension: 3 × 10–12' },
              { order: 5, name: '6. Tricep Rope Pushdowns: 3 × 12–15' },
              { order: 6, name: 'Finisher: Core Routine A + 10 min Incline Walk' },
            ],
            subActivities: [
              { name: 'Bench Press', type: 'kg' },
              { name: 'Incline DB Press', type: 'kg' },
              { name: 'Seated DB Press', type: 'kg' },
              { name: 'Cable Lateral Raises', type: 'kg' },
              { name: 'Tricep Extension', type: 'kg' },
              { name: 'Tricep Pushdowns', type: 'kg' },
              { name: 'Incline Walk', type: 'duration' },
            ],
          },
          {
            name: 'Day 2: Pull A (Back Width, Rear Delts, Biceps)',
            category: 'Fitness',
            type: 'multi-step',
            schedule: { weekdays: false, weekends: false, custom: [2] },
            advancedMode: true,
            description: 'Back width and upper-body pull focus for strong posture and arm development.',
            descriptionEnabled: true,
            steps: [
              { order: 0, name: '1. Lat Pulldowns (or Pull-Ups): 4 × 8–10' },
              { order: 1, name: '2. Seated Cable Rows (Close Grip): 3 × 8–10' },
              { order: 2, name: '3. Single-Arm Dumbbell Row: 3 × 10–12' },
              { order: 3, name: '4. Face Pulls (Rear Delts & Posture): 4 × 15' },
              { order: 4, name: '5. Barbell or EZ-Bar Bicep Curls: 3 × 8–10' },
              { order: 5, name: '6. Dumbbell Hammer Curls: 3 × 10–12' },
              { order: 6, name: 'Finisher: Core Routine B + 10 min Incline Walk' },
            ],
            subActivities: [
              { name: 'Lat Pulldowns', type: 'kg' },
              { name: 'Seated Cable Rows', type: 'kg' },
              { name: 'Single-Arm DB Row', type: 'kg' },
              { name: 'Face Pulls', type: 'kg' },
              { name: 'Barbell Curls', type: 'kg' },
              { name: 'Hammer Curls', type: 'kg' },
              { name: 'Incline Walk', type: 'duration' },
            ],
          },
          {
            name: 'Day 3: Legs A (Quad Focus, Hamstrings, Calves)',
            category: 'Fitness',
            type: 'multi-step',
            schedule: { weekdays: false, weekends: false, custom: [3] },
            advancedMode: true,
            description: 'Quad-dominant lower body strength and hypertrophy foundation.',
            descriptionEnabled: true,
            steps: [
              { order: 0, name: '1. Barbell Squats or Hack Squats: 4 × 6–8' },
              { order: 1, name: '2. Leg Press: 3 × 10–12' },
              { order: 2, name: '3. Lying or Seated Leg Curls: 3 × 10–12' },
              { order: 3, name: '4. Leg Extensions: 3 × 12–15' },
              { order: 4, name: '5. Standing Calf Raises: 4 × 15–20' },
              { order: 5, name: 'Finisher: Core Routine C' },
            ],
            subActivities: [
              { name: 'Barbell Squats', type: 'kg' },
              { name: 'Leg Press', type: 'kg' },
              { name: 'Leg Curls', type: 'kg' },
              { name: 'Leg Extensions', type: 'kg' },
              { name: 'Standing Calf Raises', type: 'kg' },
            ],
          },
          {
            name: 'Day 4: Push B (Upper Chest, Side Delts, Triceps)',
            category: 'Fitness',
            type: 'multi-step',
            schedule: { weekdays: false, weekends: false, custom: [4] },
            advancedMode: true,
            description: 'Upper-chest emphasis and shoulder capping volume for an athletic V-taper.',
            descriptionEnabled: true,
            steps: [
              { order: 0, name: '1. Incline Barbell or Smith Machine Press: 4 × 8–10' },
              { order: 1, name: '2. Flat Machine Press or Pec Deck Flyes: 3 × 10–12' },
              { order: 2, name: '3. Arnold Press or Machine Shoulder Press: 3 × 10–12' },
              { order: 3, name: '4. Dumbbell Lateral Raises (Controlled): 4 × 15' },
              { order: 4, name: '5. Skullcrushers (EZ-Bar): 3 × 10–12' },
              { order: 5, name: '6. Single-Arm Cable Pushdowns: 3 × 12–15' },
              { order: 6, name: 'Finisher: Core Routine A + 10 min Incline Walk' },
            ],
            subActivities: [
              { name: 'Incline Barbell Press', type: 'kg' },
              { name: 'Pec Deck Flyes', type: 'kg' },
              { name: 'Arnold Press', type: 'kg' },
              { name: 'DB Lateral Raises', type: 'kg' },
              { name: 'Skullcrushers', type: 'kg' },
              { name: 'Single-Arm Pushdowns', type: 'kg' },
              { name: 'Incline Walk', type: 'duration' },
            ],
          },
          {
            name: 'Day 5: Pull B (Back Thickness, Traps, Biceps Peak)',
            category: 'Fitness',
            type: 'multi-step',
            schedule: { weekdays: false, weekends: false, custom: [5] },
            advancedMode: true,
            description: 'Back thickness, mid-trap density, and bicep peak isolation.',
            descriptionEnabled: true,
            steps: [
              { order: 0, name: '1. Chest-Supported T-Bar or Machine Row: 4 × 8–10' },
              { order: 1, name: '2. Reverse-Grip (Underhand) Lat Pulldown: 3 × 10–12' },
              { order: 2, name: '3. Straight-Arm Cable Lat Pulldowns: 3 × 12–15' },
              { order: 3, name: '4. Reverse Pec Deck (Rear Delts) + Dumbbell Shrugs: 3 × 12–15' },
              { order: 4, name: '5. Incline Dumbbell Curls: 3 × 10–12' },
              { order: 5, name: '6. Preacher Curls: 3 × 12' },
              { order: 6, name: 'Finisher: Core Routine B + 10 min Incline Walk' },
            ],
            subActivities: [
              { name: 'T-Bar Row', type: 'kg' },
              { name: 'Reverse Lat Pulldown', type: 'kg' },
              { name: 'Straight-Arm Pulldowns', type: 'kg' },
              { name: 'Reverse Pec Deck', type: 'kg' },
              { name: 'Incline DB Curls', type: 'kg' },
              { name: 'Preacher Curls', type: 'kg' },
              { name: 'Incline Walk', type: 'duration' },
            ],
          },
          {
            name: 'Day 6: Legs B (Hamstrings, Glutes, Quads, Calves)',
            category: 'Fitness',
            type: 'multi-step',
            schedule: { weekdays: false, weekends: false, custom: [6] },
            advancedMode: true,
            description: 'Posterior chain, hamstring development, and unilateral leg strength.',
            descriptionEnabled: true,
            steps: [
              { order: 0, name: '1. Romanian Deadlifts (RDLs — Barbell/Dumbbell): 4 × 8–10' },
              { order: 1, name: '2. Bulgarian Split Squats or Walking Lunges: 3 × 10 per leg' },
              { order: 2, name: '3. Leg Extensions (Drop set on last set): 3 × 12–15' },
              { order: 3, name: '4. Seated Hamstring Curls: 3 × 12–15' },
              { order: 4, name: '5. Seated Calf Raises: 4 × 15–20' },
              { order: 5, name: 'Finisher: Core Routine C' },
            ],
            subActivities: [
              { name: 'Romanian Deadlifts', type: 'kg' },
              { name: 'Bulgarian Split Squats', type: 'kg' },
              { name: 'Leg Extensions', type: 'kg' },
              { name: 'Hamstring Curls', type: 'kg' },
              { name: 'Seated Calf Raises', type: 'kg' },
            ],
          },
          {
            name: 'Day 7: Active Recovery & Outdoor Steps',
            category: 'Health',
            type: 'multi-step',
            schedule: { weekdays: false, weekends: false, custom: [0] },
            description: 'No gym today. Focus on systemic recovery, mobility, and outdoor light activity.',
            descriptionEnabled: true,
            steps: [
              { order: 0, name: '1. Complete 8,000–10,000 steps outdoors' },
              { order: 1, name: '2. 10 mins of foam rolling and stretching' },
              { order: 2, name: '3. Hydration check: 3.5 Litres of water' },
              { order: 3, name: '4. Restorative sleep: 7–8 hours' },
            ],
            subActivities: [
              { name: 'Steps Count', type: 'number' },
              { name: 'Stretching Time', type: 'duration' },
            ],
          },
          {
            name: 'Lean Bulk Nutrition Protocol (2,220 kcal)',
            category: 'Diet',
            type: 'multi-step',
            schedule: { weekdays: true, weekends: true },
            description: 'Daily target: 133g Protein, 288g Carbs, ~2,220 kcal, 3.5L Water, 7-8h Sleep.',
            descriptionEnabled: true,
            steps: [
              { order: 0, name: 'Meal 1 (Pre-Workout): Banana 100g, 5 Almonds, Black Coffee (2g P / 24g C / 120 kcal)' },
              { order: 1, name: 'Meal 2 (Post-Workout): Oats 60g in 200ml Milk, Whey 30g, PB 15g, Seeds 10g (42g P / 55g C / 560 kcal)' },
              { order: 2, name: 'Meal 3 (Mid-Morning): Roasted Chana 40g, 1 Fruit 150g, Spiced Buttermilk 200ml (10g P / 42g C / 250 kcal)' },
              { order: 3, name: 'Meal 4 (Lunch): Rice 200g/3 Phulkas, Soya Chunks 50g, Dal 30g, Curd 100g + Salad (40g P / 95g C / 640 kcal)' },
              { order: 4, name: 'Meal 5 (Evening Snack): Boiled Chana / Sundal / Sprouts 50g raw (11g P / 30g C / 180 kcal)' },
              { order: 5, name: 'Meal 6 (Dinner): 2 Phulkas/Rice, Low-Fat Paneer/Tofu 120g, Veggies 150g (28g P / 42g C / 470 kcal)' },
              { order: 6, name: 'Hydration & Sleep: 3.5 Litres Water + 7-8 Hours Sleep' },
            ],
          },
        ],
      },
    },
    {
      name: 'Gym Workout',
      type: 'gym-workout',
      description: 'A structured multi-step workout routine with warmup, exercises, and cooldown.',
      category: 'Fitness',
      structure: {
        habits: [
          {
            name: 'Gym Session',
            category: 'Fitness',
            type: 'multi-step',
            steps: [
              { order: 0, name: 'Warm Up (5-10 min)' },
              { order: 1, name: 'Cardio (15-20 min)' },
              { order: 2, name: 'Strength Training (30 min)' },
              { order: 3, name: 'Core Work (10 min)' },
              { order: 4, name: 'Cool Down & Stretch (5-10 min)' },
            ],
            schedule: { weekdays: true, weekends: false },
          },
        ],
      },
    },
  ];

  for (const preset of presets) {
    await Preset.findOneAndUpdate(
      { type: preset.type },
      preset,
      { upsert: true, new: true }
    );
  }
}

