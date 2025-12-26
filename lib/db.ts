import Database from 'better-sqlite3';
import path from 'path';
import { User, Habit, DailyLog, Preset, HabitStep } from '@/types';

const dbPath = path.join(process.cwd(), 'habits.db');
let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    initDatabase();
  }
  return db;
}

// Initialize database schema
export function initDatabase() {
  const database = getDb();
  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      timeZone TEXT DEFAULT 'UTC',
      notificationPreferences TEXT DEFAULT '{"email":true,"push":true,"sms":false,"quietHours":{"start":"22:00","end":"07:00"}}',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Habits table
  database.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      steps TEXT NOT NULL,
      targetPerDay INTEGER DEFAULT 1,
      schedule TEXT DEFAULT '{"weekdays":true,"weekends":true}',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Daily logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS dailyLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      habitId INTEGER NOT NULL,
      date TEXT NOT NULL,
      stepIndex INTEGER,
      completed INTEGER DEFAULT 0,
      completedAt DATETIME,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE(userId, habitId, date, stepIndex)
    )
  `);

  // Presets table
  database.exec(`
    CREATE TABLE IF NOT EXISTS presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      structure TEXT NOT NULL
    )
  `);

  // Create indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_dailyLogs_user_date ON dailyLogs(userId, date);
    CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(userId);
  `);

  // Insert default presets
  insertDefaultPresets();
}

function insertDefaultPresets() {
  const database = getDb();
  const checkPreset = database.prepare('SELECT COUNT(*) as count FROM presets WHERE type = ?');
  
  // Weekday preset
  if (checkPreset.get('weekday')?.count === 0) {
    const weekdayPreset: Preset = {
      id: 0,
      name: 'Weekday Routine',
      type: 'weekday',
      structure: {
        habits: [
          { name: 'Wake up + Water', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Wake up and drink water' }], time: '05:00' },
          { name: 'Meditation/Breathing', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: '20 minutes meditation or breathing exercises' }], time: '05:10' },
          { name: 'Exercise/Stretch', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: '45 minutes exercise or stretching' }], time: '05:30' },
          { name: 'Freshen up', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Shower and get ready' }], time: '06:15' },
          { name: 'Reading', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: '30 minutes reading' }], time: '06:45' },
          { name: 'Breakfast + Get Ready', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Eat breakfast and prepare for day' }], time: '07:15' },
          { name: 'Phone-free Time', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'No phone usage' }], time: '21:00' },
          { name: 'Sleep Prep', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Prepare for sleep' }], time: '21:45' },
        ]
      }
    };
    database.prepare('INSERT INTO presets (name, type, structure) VALUES (?, ?, ?)')
      .run(weekdayPreset.name, weekdayPreset.type, JSON.stringify(weekdayPreset.structure));
  }

  // Sunday preset
  if (checkPreset.get('sunday')?.count === 0) {
    const sundayPreset: Preset = {
      id: 0,
      name: 'Sunday Routine',
      type: 'sunday',
      structure: {
        habits: [
          { name: 'Wake + Light Stretch', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Wake up and light stretching' }], time: '05:30' },
          { name: 'Exercise/Walk', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: '60 minutes exercise or walk' }], time: '06:00' },
          { name: 'Reading/News', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Read news or books' }], time: '07:00' },
          { name: 'Personal Learning', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: '2 hours personal learning' }], time: '08:00' },
          { name: 'Weekly Review/Planning', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Review week and plan ahead' }], time: '16:00' },
        ]
      }
    };
    database.prepare('INSERT INTO presets (name, type, structure) VALUES (?, ?, ?)')
      .run(sundayPreset.name, sundayPreset.type, JSON.stringify(sundayPreset.structure));
  }

  // Gym preset
  if (checkPreset.get('gym')?.count === 0) {
    const gymPreset: Preset = {
      id: 0,
      name: 'Gym Routine',
      type: 'gym',
      structure: {
        habits: [
          { name: 'Monday: Push Day', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Warm-up (10 min)' },
            { order: 1, name: 'Bench Press (4x8)' },
            { order: 2, name: 'Overhead Press (4x8)' },
            { order: 3, name: 'Tricep Dips (3x10)' },
            { order: 4, name: 'Cool-down (10 min)' }
          ] },
          { name: 'Tuesday: Pull Day', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Warm-up (10 min)' },
            { order: 1, name: 'Deadlifts (4x6)' },
            { order: 2, name: 'Pull-ups (3x8)' },
            { order: 3, name: 'Rows (4x8)' },
            { order: 4, name: 'Cool-down (10 min)' }
          ] },
          { name: 'Wednesday: Legs Day', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Warm-up (10 min)' },
            { order: 1, name: 'Squats (4x8)' },
            { order: 2, name: 'Lunges (3x12)' },
            { order: 3, name: 'Leg Press (4x10)' },
            { order: 4, name: 'Cool-down (10 min)' }
          ] },
          { name: 'Thursday: Mobility', category: 'Fitness', type: 'single-step', steps: [
            { order: 0, name: '30-45 minutes mobility and stretching' }
          ] },
          { name: 'Friday: Full Body', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Warm-up (10 min)' },
            { order: 1, name: 'Compound movements (30 min)' },
            { order: 2, name: 'Cardio (20 min)' },
            { order: 3, name: 'Cool-down (10 min)' }
          ] },
        ]
      }
    };
    database.prepare('INSERT INTO presets (name, type, structure) VALUES (?, ?, ?)')
      .run(gymPreset.name, gymPreset.type, JSON.stringify(gymPreset.structure));
  }

  // Diet preset
  if (checkPreset.get('diet')?.count === 0) {
    const dietPreset: Preset = {
      id: 0,
      name: 'Diet Guidelines',
      type: 'diet',
      structure: {
        habits: [
          { name: 'Hydration', category: 'Health', type: 'multi-step', steps: [
            { order: 0, name: '1 glass of water (250ml)' },
            { order: 1, name: '2 glasses of water (500ml)' },
            { order: 2, name: '3 glasses of water (750ml)' },
            { order: 3, name: '4 glasses of water (1L)' },
            { order: 4, name: '5 glasses of water (1.25L)' },
            { order: 5, name: '6 glasses of water (1.5L)' },
            { order: 6, name: '7 glasses of water (1.75L)' },
            { order: 7, name: '8 glasses of water (2L)' }
          ] },
          { name: 'Protein Intake', category: 'Diet', type: 'single-step', steps: [
            { order: 0, name: 'Meet daily protein goal (0.8-1.2g per kg body weight)' }
          ] },
          { name: 'Fiber Intake', category: 'Diet', type: 'single-step', steps: [
            { order: 0, name: 'Consume 25-38g fiber daily' }
          ] },
          { name: 'Balanced Meals', category: 'Diet', type: 'single-step', steps: [
            { order: 0, name: 'Include protein, fiber, and healthy fats in each meal' }
          ] },
        ]
      }
    };
    database.prepare('INSERT INTO presets (name, type, structure) VALUES (?, ?, ?)')
      .run(dietPreset.name, dietPreset.type, JSON.stringify(dietPreset.structure));
  }
}

// Database is initialized on first access via getDb()

