/**
 * Open-Source Inspired Periodization & Training Cycle Engine
 * Based on Prilepin's Chart, Helms' Muscle & Strength Pyramid, and wger workout cycles.
 * 
 * Supports:
 * - 4-Quarter 52-Week Mesocycles
 * - Dynamic Sets, Reps, RPE, and Volume scaling per phase
 * - Scheduled Deload Weeks (every 6th week) with 50% volume cuts
 * - Target working weight calculations (% of 1RM)
 * - 1-Click Habit synchronization to active phase
 */

export interface PhaseConfig {
  phase: number;
  name: string;
  quarter: string;
  badge: string;
  color: string;
  duration: string;
  weeks: [number, number]; // [startWeek, endWeek]
  primaryRepRange: string;
  accessoryRepRange: string;
  repTarget: string;
  rpe: string;
  compoundRpe: string;
  accessoryRpe: string;
  loadPct1RM: number; // e.g. 0.80 for 80%
  focus: string;
  progressionRule: string;
  rules: string[];
  nutritionGoal: string;
  nutritionKcal: number;
  nutritionProteinGrams: number;
  nutritionCarbsGrams: number;
}

export const PERIODIZATION_PHASES: PhaseConfig[] = [
  {
    phase: 1,
    name: 'Foundation & Neuromuscular Base',
    quarter: 'Quarter 1',
    badge: 'Foundation',
    color: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400',
    duration: 'Months 1–3 (Weeks 1–12)',
    weeks: [1, 12],
    primaryRepRange: '8–12 Reps',
    accessoryRepRange: '10–12 Reps',
    repTarget: '8–12 Reps',
    rpe: 'RPE 7–8 (2–3 reps in reserve)',
    compoundRpe: 'RPE 7–8 (2–3 reps in reserve)',
    accessoryRpe: 'RPE 8',
    loadPct1RM: 0.75, // 75% 1RM
    focus: 'Master movement execution, establish compound weight baselines, groove mind-muscle connection.',
    progressionRule: 'Add 1 rep per set until reaching top of range (12 reps), then increase weight by 2.5 kg.',
    rules: [
      'Log every set, rep, and weight meticulously.',
      'Progress by adding 1 rep per set until reaching top of range, then increase weight by 2.5kg.',
      'Week 6 & Week 12: Scheduled Deload weeks (50% reduction in volume, same weight).',
    ],
    nutritionGoal: 'Lean Bulk (+200 kcal surplus)',
    nutritionKcal: 2220,
    nutritionProteinGrams: 133,
    nutritionCarbsGrams: 288,
  },
  {
    phase: 2,
    name: 'Heavy Strength Escalation',
    quarter: 'Quarter 2',
    badge: 'Heavy Overload',
    color: 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400',
    duration: 'Months 4–6 (Weeks 13–24)',
    weeks: [13, 24],
    primaryRepRange: '6–8 Reps (Heavy)',
    accessoryRepRange: '8–10 Reps',
    repTarget: '6–8 Reps (Compounds) / 8–10 (Accessories)',
    rpe: 'RPE 8–9 (1–2 reps in reserve)',
    compoundRpe: 'RPE 8–9 (1–2 reps in reserve)',
    accessoryRpe: 'RPE 8.5',
    loadPct1RM: 0.82, // 82% 1RM
    focus: 'Maximal mechanical tension. Force strength adaptations on Bench, Squat, Lat Rows, and RDLs.',
    progressionRule: 'Add 1.25 kg to 2.5 kg every 2 weeks on compound lifts; rest 3 mins between heavy sets.',
    rules: [
      'Target 1.25kg to 2.5kg load increase every 2 weeks on compound presses and squats.',
      'Ensure 3 minutes rest between heavy compound sets.',
      'Week 18 & Week 24: Scheduled active recovery deload.',
    ],
    nutritionGoal: 'Lean Bulk (+250 kcal surplus)',
    nutritionKcal: 2270,
    nutritionProteinGrams: 135,
    nutritionCarbsGrams: 295,
  },
  {
    phase: 3,
    name: 'Sarcoplasmic Hypertrophy & Density',
    quarter: 'Quarter 3',
    badge: 'Hypertrophy Peak',
    color: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400',
    duration: 'Months 7–9 (Weeks 25–36)',
    weeks: [25, 36],
    primaryRepRange: '10–12 Reps (3s eccentrics)',
    accessoryRepRange: '12–15 Reps + Drop Sets',
    repTarget: '10–15 Reps + Drop Sets',
    rpe: 'RPE 9–10 (0–1 rep in reserve on last set)',
    compoundRpe: 'RPE 9 (1 rep in reserve)',
    accessoryRpe: 'RPE 10 (Last set to failure)',
    loadPct1RM: 0.70, // 70% 1RM
    focus: 'Metabolic stress, extreme sarcoplasmic pump volume, and muscle cross-sectional expansion.',
    progressionRule: 'Include a triple drop set on final set of isolations; maintain 3-second lowering tempo.',
    rules: [
      'Last set of lateral raises, leg extensions, and rope pushdowns to include a triple drop set.',
      'Strict 3-second eccentric (lowering) tempo on all isolation lifts.',
      'Week 30 & Week 36: Scheduled Deload.',
    ],
    nutritionGoal: 'Maintenance Resensitization (Month 9)',
    nutritionKcal: 2050,
    nutritionProteinGrams: 135,
    nutritionCarbsGrams: 245,
  },
  {
    phase: 4,
    name: 'Peak Realization & Body Recomposition',
    quarter: 'Quarter 4',
    badge: 'Peak & Consolidation',
    color: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
    duration: 'Months 10–12 (Weeks 37–52)',
    weeks: [37, 52],
    primaryRepRange: 'Wave: Odd Wks 6–8, Even Wks 10–12',
    accessoryRepRange: '10–12 Reps',
    repTarget: 'Periodized Waves (Week A: 6–8, Week B: 10–12)',
    rpe: 'RPE 8.5–9.5',
    compoundRpe: 'RPE 8.5–9.5',
    accessoryRpe: 'RPE 9',
    loadPct1RM: 0.85, // 85% on heavy waves
    focus: 'Test 1RM/5RM personal records, shed body fat via mini-cut, and showcase hardened muscle cuts.',
    progressionRule: 'Wave loading; test 5RM in Week 48 and 1RM in Week 52.',
    rules: [
      'Test 5RM on Bench, Squat, and RDL in Week 48 and Week 52.',
      'Fine-tune daily calories: keep lean bulk +200 kcal or enter 4-week mini-cut to reveal muscle definition.',
      'Celebrate 1-year consistency milestones and establish Year 2 goals.',
    ],
    nutritionGoal: 'Mini-Cut Definition (Months 10–11) -> Maintenance (Month 12)',
    nutritionKcal: 1850,
    nutritionProteinGrams: 140,
    nutritionCarbsGrams: 180,
  },
];

export const SCHEDULED_DELOAD_WEEKS = [6, 12, 18, 24, 30, 36, 42, 48];

export function isScheduledDeload(week: number): boolean {
  return SCHEDULED_DELOAD_WEEKS.includes(week);
}

export function getPhaseByWeek(week: number): PhaseConfig {
  const clampedWeek = Math.max(1, Math.min(52, week));
  const found = PERIODIZATION_PHASES.find(p => clampedWeek >= p.weeks[0] && clampedWeek <= p.weeks[1]);
  return found || PERIODIZATION_PHASES[0];
}

/**
 * Returns dynamic sets and reps for a given day, phase, and deload status.
 */
export function getPhaseWorkoutDays(phaseNumber: number = 1, isDeload: boolean = false, baseBench1RM: number = 70) {
  const phase = PERIODIZATION_PHASES.find(p => p.phase === phaseNumber) || PERIODIZATION_PHASES[0];

  const benchTarget = Math.round(baseBench1RM * (isDeload ? 0.60 : phase.loadPct1RM));
  const squatTarget = Math.round((baseBench1RM * 1.3) * (isDeload ? 0.60 : phase.loadPct1RM));
  const rdlTarget = Math.round((baseBench1RM * 1.2) * (isDeload ? 0.60 : phase.loadPct1RM));
  const pulldownTarget = Math.round((baseBench1RM * 0.85) * (isDeload ? 0.60 : phase.loadPct1RM));

  return [
    {
      day: 'Day 1 (Mon)',
      shortDay: 'Mon',
      focus: isDeload ? 'Push A (Deload & Joint Recovery)' : `Push A (${phase.primaryRepRange})`,
      type: 'Push',
      color: 'from-orange-500 to-amber-600',
      isDeload,
      phaseNumber: phase.phase,
      phaseName: phase.name,
      exercises: [
        { 
          num: 1, 
          name: 'Flat Dumbbell or Barbell Bench Press', 
          sets: isDeload ? '2 × 8–10' : phase.phase === 2 ? '4 × 6–8' : phase.phase === 3 ? '4 × 10–12' : phase.phase === 4 ? '4 × 6–8 / 3 × 10' : '4 × 8–12', 
          targetLoadKg: benchTarget,
          intensity: isDeload ? 'RPE 6 (Deload)' : phase.compoundRpe,
          muscle: 'Chest & Front Delts', 
          cue: isDeload ? 'Smooth light reps, focus on full chest stretch without fatigue.' : phase.phase === 3 ? 'Strict 3-second eccentric descent, explosive push.' : 'Retract scapulae, arch upper back, control eccentric for 2–3s.' 
        },
        { 
          num: 2, 
          name: 'Incline Dumbbell Press', 
          sets: isDeload ? '2 × 8–10' : phase.phase === 2 ? '3 × 8–10' : phase.phase === 3 ? '3 × 10–12' : '3 × 8–12', 
          targetLoadKg: Math.round(benchTarget * 0.75),
          intensity: isDeload ? 'RPE 6' : phase.compoundRpe,
          muscle: 'Clavicular (Upper) Chest', 
          cue: 'Set bench to 30°, press up and slightly inward without clanking.' 
        },
        { 
          num: 3, 
          name: 'Seated Dumbbell Overhead Press', 
          sets: isDeload ? '2 × 8–10' : '3 × 8–10', 
          targetLoadKg: Math.round(benchTarget * 0.55),
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Anterior & Lateral Delts', 
          cue: 'Keep core tight, press in plane of scapula, full lockout.' 
        },
        { 
          num: 4, 
          name: 'Cable Lateral Raises', 
          sets: isDeload ? '2 × 12–15' : phase.phase === 3 ? '4 × 15 (Triple Drop Set)' : '4 × 12–15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.phase === 3 ? 'RPE 10' : 'RPE 8.5',
          muscle: 'Lateral Deltoids', 
          cue: 'Set pulley to wrist height, lead with elbows, control descent.' 
        },
        { 
          num: 5, 
          name: 'Overhead Dumbbell/Cable Tricep Extension', 
          sets: isDeload ? '2 × 10–12' : '3 × 10–12', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Triceps (Long Head)', 
          cue: 'Deep elbow flexion behind head for maximum stretch.' 
        },
        { 
          num: 6, 
          name: 'Tricep Rope Pushdowns', 
          sets: isDeload ? '2 × 12–15' : phase.phase === 3 ? '3 × 15 (Drop set)' : '3 × 12–15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Triceps (Lateral Head)', 
          cue: 'Flay rope apart at bottom, lock elbows by sides.' 
        },
      ],
      finisher: isDeload ? '10 min Light Incline Walk (No Core Fatigue)' : 'Core Routine A + 10 min Incline Walk',
      finisherDetails: isDeload ? 'Easy 3.5 km/h walking pace to circulate lactic acid and oxygenate tissue.' : 'Core A: Hanging Leg Raises 3 × 12 + Planks 3 × 60s. Incline Walk: 12% incline @ 4.5 km/h.',
    },
    {
      day: 'Day 2 (Tue)',
      shortDay: 'Tue',
      focus: isDeload ? 'Pull A (Deload & Spine Reset)' : `Pull A (${phase.primaryRepRange})`,
      type: 'Pull',
      color: 'from-blue-500 to-indigo-600',
      isDeload,
      phaseNumber: phase.phase,
      phaseName: phase.name,
      exercises: [
        { 
          num: 1, 
          name: 'Lat Pulldowns (or Pull-Ups)', 
          sets: isDeload ? '2 × 8–10' : phase.phase === 2 ? '4 × 6–8' : phase.phase === 3 ? '4 × 10–12' : '4 × 8–12', 
          targetLoadKg: pulldownTarget,
          intensity: isDeload ? 'RPE 6' : phase.compoundRpe,
          muscle: 'Lats & Upper Back', 
          cue: 'Drive elbows down and back to hips; full overhead stretch.' 
        },
        { 
          num: 2, 
          name: 'Seated Cable Rows (Close Grip)', 
          sets: isDeload ? '2 × 8–10' : '3 × 8–10', 
          targetLoadKg: pulldownTarget,
          intensity: isDeload ? 'RPE 6' : phase.compoundRpe,
          muscle: 'Mid-Back & Rhomboids', 
          cue: 'Squeeze shoulder blades together, minimal torso swing.' 
        },
        { 
          num: 3, 
          name: 'Single-Arm Dumbbell Row', 
          sets: isDeload ? '2 × 10' : '3 × 10–12', 
          targetLoadKg: Math.round(pulldownTarget * 0.5),
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Latissimus Dorsi', 
          cue: 'Pull dumbbell towards hip crease; keep spine neutral.' 
        },
        { 
          num: 4, 
          name: 'Face Pulls (Rear Delts & Posture)', 
          sets: isDeload ? '2 × 15' : '4 × 15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : 'RPE 8',
          muscle: 'Rear Delts & Rotator Cuff', 
          cue: 'Pull rope towards eye level, externally rotate hands backward.' 
        },
        { 
          num: 5, 
          name: 'Barbell or EZ-Bar Bicep Curls', 
          sets: isDeload ? '2 × 8–10' : phase.phase === 2 ? '3 × 6–8' : '3 × 8–12', 
          targetLoadKg: Math.round(baseBench1RM * 0.45),
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Biceps Brachii', 
          cue: 'Strict form; pin elbows to ribs, no momentum.' 
        },
        { 
          num: 6, 
          name: 'Dumbbell Hammer Curls', 
          sets: isDeload ? '2 × 10' : phase.phase === 3 ? '3 × 12 (Drop set)' : '3 × 10–12', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Brachialis & Forearms', 
          cue: 'Neutral grip throughout, builds arm thickness and forearm grip.' 
        },
      ],
      finisher: isDeload ? '10 min Light Incline Walk' : 'Core Routine B + 10 min Incline Walk',
      finisherDetails: isDeload ? 'Gentle flat walk to promote lymphatic flow.' : 'Core B: Cable Woodchoppers 3 × 15/side + Ab Wheel Rollouts 3 × 10. Incline Walk: 12% incline @ 4.5 km/h.',
    },
    {
      day: 'Day 3 (Wed)',
      shortDay: 'Wed',
      focus: isDeload ? 'Legs A (Deload & Knee Relief)' : `Legs A (${phase.primaryRepRange})`,
      type: 'Legs',
      color: 'from-emerald-500 to-teal-600',
      isDeload,
      phaseNumber: phase.phase,
      phaseName: phase.name,
      exercises: [
        { 
          num: 1, 
          name: 'Barbell Squats or Hack Squats', 
          sets: isDeload ? '2 × 8' : phase.phase === 2 ? '4 × 6–8' : phase.phase === 3 ? '4 × 10–12' : '4 × 8–12', 
          targetLoadKg: squatTarget,
          intensity: isDeload ? 'RPE 6 (Deload 60%)' : phase.compoundRpe,
          muscle: 'Quadriceps & Glutes', 
          cue: 'Break at knees and hips together, hit parallel with upright chest.' 
        },
        { 
          num: 2, 
          name: 'Leg Press', 
          sets: isDeload ? '2 × 10' : '3 × 10–12', 
          targetLoadKg: Math.round(squatTarget * 1.4),
          intensity: isDeload ? 'RPE 6' : phase.compoundRpe,
          muscle: 'Quads & Adductors', 
          cue: 'Feet shoulder-width on middle of platform, avoid knee valgus.' 
        },
        { 
          num: 3, 
          name: 'Lying or Seated Leg Curls', 
          sets: isDeload ? '2 × 10' : '3 × 10–12', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Hamstrings', 
          cue: 'Slow 3-second negative eccentric, pause for 1 second at peak contraction.' 
        },
        { 
          num: 4, 
          name: 'Leg Extensions', 
          sets: isDeload ? '2 × 12' : phase.phase === 3 ? '3 × 15 (Triple Drop Set)' : '3 × 12–15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Quad Rectus Femoris', 
          cue: 'Pause 1s at top extension, pump blood into quads.' 
        },
        { 
          num: 5, 
          name: 'Standing Calf Raises', 
          sets: isDeload ? '2 × 15' : '4 × 15–20', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : 'RPE 8.5',
          muscle: 'Gastrocnemius', 
          cue: 'Deep heel drop at bottom, rise high onto big toes.' 
        },
      ],
      finisher: isDeload ? 'Hamstring & Hip Flexor Static Stretch' : 'Core Routine C',
      finisherDetails: isDeload ? 'Hold deep pigeon pose and couch stretch for 60 seconds per leg.' : 'Core C: Captain’s Chair Knee Tucks 3 × 15 + Pallof Press 3 × 12/side.',
    },
    {
      day: 'Day 4 (Thu)',
      shortDay: 'Thu',
      focus: isDeload ? 'Push B (Deload & Shoulder Care)' : `Push B (${phase.primaryRepRange})`,
      type: 'Push',
      color: 'from-orange-500 to-rose-600',
      isDeload,
      phaseNumber: phase.phase,
      phaseName: phase.name,
      exercises: [
        { 
          num: 1, 
          name: 'Incline Barbell or Smith Machine Press', 
          sets: isDeload ? '2 × 8–10' : phase.phase === 2 ? '4 × 6–8' : '4 × 8–10', 
          targetLoadKg: Math.round(benchTarget * 0.85),
          intensity: isDeload ? 'RPE 6' : phase.compoundRpe,
          muscle: 'Upper Chest (Clavicular)', 
          cue: 'Lower to upper chest, drive up without bouncing off ribcage.' 
        },
        { 
          num: 2, 
          name: 'Flat Machine Press or Pec Deck Flyes', 
          sets: isDeload ? '2 × 10' : '3 × 10–12', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.compoundRpe,
          muscle: 'Sternal Pecs', 
          cue: 'Focus on maximum horizontal adduction & deep stretch.' 
        },
        { 
          num: 3, 
          name: 'Arnold Press or Machine Shoulder Press', 
          sets: isDeload ? '2 × 10' : '3 × 10–12', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Shoulders (All Heads)', 
          cue: 'Rotate from palms facing in to palms facing out on ascent.' 
        },
        { 
          num: 4, 
          name: 'Dumbbell Lateral Raises (Controlled)', 
          sets: isDeload ? '2 × 12' : '4 × 15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : 'RPE 8.5',
          muscle: 'Lateral Deltoids', 
          cue: 'No body English; slight forward torso lean, pour the water pitcher cue.' 
        },
        { 
          num: 5, 
          name: 'Skullcrushers (EZ-Bar)', 
          sets: isDeload ? '2 × 10' : '3 × 10–12', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Triceps (Medial & Long Heads)', 
          cue: 'Lower bar towards forehead or slightly behind head for tricep tension.' 
        },
        { 
          num: 6, 
          name: 'Single-Arm Cable Pushdowns', 
          sets: isDeload ? '2 × 12' : '3 × 12–15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Triceps Isolation', 
          cue: 'Isolate each arm individually to correct left/right imbalances.' 
        },
      ],
      finisher: isDeload ? '10 min Incline Walk' : 'Core Routine A + 10 min Incline Walk',
      finisherDetails: isDeload ? 'Zone 2 heart-rate walk for active recovery.' : 'Core A: Hanging Leg Raises 3 × 12 + Planks 3 × 60s. Incline Walk: 12% incline @ 4.5 km/h.',
    },
    {
      day: 'Day 5 (Fri)',
      shortDay: 'Fri',
      focus: isDeload ? 'Pull B (Deload & Scapular Health)' : `Pull B (${phase.primaryRepRange})`,
      type: 'Pull',
      color: 'from-cyan-500 to-blue-600',
      isDeload,
      phaseNumber: phase.phase,
      phaseName: phase.name,
      exercises: [
        { 
          num: 1, 
          name: 'Chest-Supported T-Bar or Machine Row', 
          sets: isDeload ? '2 × 8–10' : phase.phase === 2 ? '4 × 6–8' : '4 × 8–10', 
          targetLoadKg: pulldownTarget,
          intensity: isDeload ? 'RPE 6' : phase.compoundRpe,
          muscle: 'Mid-Back, Rhomboids, Traps', 
          cue: 'Zero lower back fatigue; pull elbows high and back, squeeze.' 
        },
        { 
          num: 2, 
          name: 'Reverse-Grip (Underhand) Lat Pulldown', 
          sets: isDeload ? '2 × 10' : '3 × 10–12', 
          targetLoadKg: pulldownTarget,
          intensity: isDeload ? 'RPE 6' : phase.compoundRpe,
          muscle: 'Lower Lats & Biceps', 
          cue: 'Supinated grip activates lower lat fibers and bicep assist.' 
        },
        { 
          num: 3, 
          name: 'Straight-Arm Cable Lat Pulldowns', 
          sets: isDeload ? '2 × 12' : '3 × 12–15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Latissimus Isolation', 
          cue: 'Arms nearly straight, sweep bar in arc down to thighs.' 
        },
        { 
          num: 4, 
          name: 'Reverse Pec Deck + Dumbbell Shrugs', 
          sets: isDeload ? '2 × 12' : '3 × 12–15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : 'RPE 8.5',
          muscle: 'Rear Delts & Upper Traps', 
          cue: 'Superset: Rear delt flyes immediately followed by heavy controlled shrugs.' 
        },
        { 
          num: 5, 
          name: 'Incline Dumbbell Curls', 
          sets: isDeload ? '2 × 10' : '3 × 10–12', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Biceps (Long Head Stretch)', 
          cue: 'Bench set at 45°, arm hangs behind torso for extreme bicep stretch.' 
        },
        { 
          num: 6, 
          name: 'Preacher Curls', 
          sets: isDeload ? '2 × 10' : '3 × 12', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Biceps Peak (Short Head)', 
          cue: 'Eliminate shoulder cheat; strict peak bicep contraction.' 
        },
      ],
      finisher: isDeload ? '10 min Incline Walk' : 'Core Routine B + 10 min Incline Walk',
      finisherDetails: isDeload ? 'Low-stress brisk walk for recovery.' : 'Core B: Cable Woodchoppers 3 × 15/side + Ab Wheel Rollouts 3 × 10. Incline Walk: 12% incline @ 4.5 km/h.',
    },
    {
      day: 'Day 6 (Sat)',
      shortDay: 'Sat',
      focus: isDeload ? 'Legs B (Deload & Posterior Recovery)' : `Legs B (${phase.primaryRepRange})`,
      type: 'Legs',
      color: 'from-purple-500 to-indigo-600',
      isDeload,
      phaseNumber: phase.phase,
      phaseName: phase.name,
      exercises: [
        { 
          num: 1, 
          name: 'Romanian Deadlifts (RDLs — Barbell/DB)', 
          sets: isDeload ? '2 × 8' : phase.phase === 2 ? '4 × 6–8' : '4 × 8–10', 
          targetLoadKg: rdlTarget,
          intensity: isDeload ? 'RPE 6 (Deload 60%)' : phase.compoundRpe,
          muscle: 'Hamstrings & Glutes', 
          cue: 'Hinge hips backwards, keep bar grazing thighs, feel massive hamstring stretch.' 
        },
        { 
          num: 2, 
          name: 'Bulgarian Split Squats or Walking Lunges', 
          sets: isDeload ? '2 × 8 per leg' : '3 × 10 per leg', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.compoundRpe,
          muscle: 'Glutes, Quads, Adductors', 
          cue: 'Elevate rear foot, sink down and slightly back into front hip.' 
        },
        { 
          num: 3, 
          name: 'Leg Extensions (Drop set on last set)', 
          sets: isDeload ? '2 × 12' : phase.phase === 3 ? '3 × 15 (Triple Drop)' : '3 × 12–15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Quadriceps Burnout', 
          cue: 'On set 3, complete 15 reps, immediately drop weight 30% and rep to failure.' 
        },
        { 
          num: 4, 
          name: 'Seated Hamstring Curls', 
          sets: isDeload ? '2 × 12' : '3 × 12–15', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : phase.accessoryRpe,
          muscle: 'Hamstrings', 
          cue: 'Seated position places hamstrings on stretch at hip, superior hypertrophy.' 
        },
        { 
          num: 5, 
          name: 'Seated Calf Raises', 
          sets: isDeload ? '2 × 15' : '4 × 15–20', 
          targetLoadKg: 0,
          intensity: isDeload ? 'RPE 6' : 'RPE 8.5',
          muscle: 'Soleus (Deep Calf)', 
          cue: 'Knees bent 90° targets soleus muscle; pause 2s at stretch.' 
        },
      ],
      finisher: isDeload ? 'Deep Hip & Glute Stretch' : 'Core Routine C',
      finisherDetails: isDeload ? 'Foam roll glutes, IT bands, and lumbar spine for 10 minutes.' : 'Core C: Captain’s Chair Knee Tucks 3 × 15 + Pallof Press 3 × 12/side.',
    },
    {
      day: 'Day 7 (Sun)',
      shortDay: 'Sun',
      focus: isDeload ? 'Active Recovery (Deload Reset)' : 'Active Recovery',
      type: 'Recovery',
      color: 'from-slate-500 to-zinc-600',
      isDeload,
      phaseNumber: phase.phase,
      phaseName: phase.name,
      exercises: [
        { 
          num: 1, 
          name: 'Outdoor Steps Walk', 
          sets: isDeload ? '6,000–8,000 gentle steps' : '8,000–10,000 steps', 
          targetLoadKg: 0,
          intensity: 'Parasympathetic Reset',
          muscle: 'Cardiovascular & Lymphatic', 
          cue: 'Outdoor natural daylight, steady brisk walking pace for parasympathetic reset.' 
        },
        { 
          num: 2, 
          name: 'Foam Rolling & Mobility', 
          sets: isDeload ? '15–20 mins full body' : '10–15 mins', 
          targetLoadKg: 0,
          intensity: 'Myofascial Release',
          muscle: 'Thoracic, IT Bands, Quads', 
          cue: 'Spend 60–90 seconds on tender trigger points; deep diaphragmatic breathing.' 
        },
        { 
          num: 3, 
          name: 'Full-Body Static Stretching', 
          sets: '10–15 mins', 
          targetLoadKg: 0,
          intensity: 'Mobility',
          muscle: 'Hip Flexors, Hamstrings, Pecs', 
          cue: 'Hold stretches for 30–45s without bouncing.' 
        },
      ],
      finisher: 'Hydration & Sleep Protocol',
      finisherDetails: '3.5 Litres mineral water + 7–8 hours uninterrupted restorative sleep.',
    },
  ];
}

/**
 * Generates the habit definitions ready for DB storage or updating for any phase/week.
 */
export function getPhaseHabitsForDb(phaseNumber: number = 1, isDeload: boolean = false, weekNumber: number = 1) {
  const days = getPhaseWorkoutDays(phaseNumber, isDeload);
  const phase = PERIODIZATION_PHASES.find(p => p.phase === phaseNumber) || PERIODIZATION_PHASES[0];

  const habits = days.map((d, idx) => {
    const dayNum = idx + 1;
    const isRest = idx === 6;
    const weekdayIdx = dayNum === 7 ? 0 : dayNum; // 0=Sun, 1=Mon, ..., 6=Sat

    const steps = d.exercises.map((ex, stepIdx) => ({
      order: stepIdx,
      name: `${ex.num}. ${ex.name}: ${ex.sets}${ex.targetLoadKg ? ` (~${ex.targetLoadKg}kg)` : ''} [${ex.intensity}]`,
    }));

    steps.push({
      order: steps.length,
      name: `Finisher: ${d.finisher}`,
    });

    return {
      name: `Day ${dayNum}: ${d.focus}`,
      category: isRest ? 'Health' : 'Fitness',
      type: 'multi-step',
      schedule: { weekdays: false, weekends: false, custom: [weekdayIdx] },
      advancedMode: true,
      description: isDeload 
        ? `🛡️ DELOAD WEEK (W${weekNumber}): 50% volume cut. RPE 6. Focus on joint recovery and CNS restoration.`
        : `${phase.name} (Quarter ${phase.quarter}, Week ${weekNumber}). Target: ${phase.primaryRepRange} @ ${phase.compoundRpe}. ${phase.progressionRule}`,
      descriptionEnabled: true,
      steps,
      subActivities: d.exercises.map(ex => ({
        name: ex.name.split('(')[0].trim().slice(0, 30),
        type: (ex.name.toLowerCase().includes('walk') ? 'duration' : 'kg') as 'text' | 'number' | 'reps' | 'duration' | 'kg',
      })),
    };
  });

  // Daily Nutrition Habit adjusted for phase
  habits.push({
    name: `Daily ${phase.nutritionKcal} kcal Nutrition & 3.5L Water`,
    category: 'Diet',
    type: 'multi-step',
    schedule: { weekdays: true, weekends: true, custom: [] },
    advancedMode: true,
    description: `Daily nutrition for ${phase.name}: ${phase.nutritionGoal} (${phase.nutritionProteinGrams}g Protein, ${phase.nutritionCarbsGrams}g Carbs, ~${phase.nutritionKcal} kcal).`,
    descriptionEnabled: true,
    steps: [
      { order: 0, name: 'Meal 1 (Pre-Workout): Banana + 5 Almonds + Black Coffee' },
      { order: 1, name: 'Meal 2 (Post-Workout): 60g Oats + 1 Scoop Whey + 1 tbsp Peanut Butter' },
      { order: 2, name: 'Meal 3 (Mid-Morning): 40g Roasted Chana + Guava/Apple + Buttermilk' },
      { order: 3, name: 'Meal 4 (Lunch): 200g Rice/3 Phulkas + 50g Soya Chunks + 1 Bowl Dal + Curd' },
      { order: 4, name: 'Meal 5 (Snack): 50g Boiled Chana/Sprouts Sundal' },
      { order: 5, name: 'Meal 6 (Dinner): 2 Phulkas + 120g Low-Fat Paneer/Tofu + Veggies' },
      { order: 6, name: 'Hydration & Sleep: Drink 3.5 Litres Water + 7–8 Hours Sleep' },
    ],
    subActivities: [
      { name: 'Water (Litres)', type: 'number' },
      { name: 'Protein (Grams)', type: 'number' },
      { name: 'Sleep (Hours)', type: 'number' },
    ],
  });

  return habits;
}
