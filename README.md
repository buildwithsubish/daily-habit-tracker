# Daily Habit Tracker - Complete Documentation

A comprehensive web-based habit tracker with daily reminders, multi-step habits, visual progress dashboards, AI-driven motivation, per-user themes with 28 deadly dark color combinations, and health tips.

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Deployment Options](#deployment-options)
5. [Environment Setup](#environment-setup)
6. [Admin Access](#admin-access)
7. [Themes System](#themes-system)
8. [API Endpoints](#api-endpoints)
9. [Project Structure](#project-structure)
10. [Database Schema](#database-schema)

---

## Features

### Core Features
- **User Authentication**: Secure email/password authentication with JWT tokens
- **Habit Management**: Create single-step or multi-step habits with categories
- **Daily Tracking**: Check-in system with progress tracking and visual indicators
- **Dashboard**: Visual analytics with charts and progress metrics
- **Presets**: Pre-configured routines (Weekday, Sunday, Gym, Diet)
- **AI Coach**: Personalized health tips for diet, hydration, and workouts
- **Streaks**: Configurable streak tracking for motivation
- **Drag & Drop**: Reorder habits with smooth animations
- **Responsive Design**: Fully mobile-adaptive UI

### Theme System (Advanced)
- **28 Deadly Dark Themes**: Black and red color combinations
- **Per-User Theme Selection**: Each user can apply their own personal theme
- **Admin Image Customization**: Upload custom background and accent images
- **Theme Persistence**: User themes saved to profile and applied on login
- **Default Theme Support**: Revert to default theme anytime
- **Real-time Application**: Themes apply instantly without reload

### Security Features
- **Enhanced Password Security**: 12 bcrypt salt rounds
- **XSS Protection**: Input sanitization on all user inputs
- **CSRF Prevention**: Secure cookie handling
- **Admin Access Control**: Separate admin authentication with role-based access
- **Account Lockout**: 5 failed attempts trigger 30-minute lockout
- **Token-Based Auth**: JWT with configurable expiration

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 14.2.35, React, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication** | JWT, bcryptjs |
| **UI Components** | Lucide React Icons |
| **Charts** | Recharts |
| **Drag & Drop** | dnd-kit |
| **Styling** | Glassmorphism, Animations, Responsive CSS |
| **Security** | Input sanitization, XSS prevention, rate limiting |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18 or higher
- MongoDB (local or Atlas)
- npm or yarn

### Installation (5 Minutes)

#### 1. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd daily_habit_tracker
npm install
```

#### 2. Set Up MongoDB

**Option A: MongoDB Atlas (Cloud - Recommended)**
```bash
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create free M0 cluster
# 3. Create database user
# 4. Allow 0.0.0.0/0 in Network Access
# 5. Copy connection string
```

**Option B: Local MongoDB**
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod
```

#### 3. Create Environment Configuration
Create `.env.local`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/habit-tracker
# OR use MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/habit-tracker

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-in-production
ADMIN_JWT_SECRET=your-different-admin-secret-key-min-32-chars

# Admin Account
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=YourSuperSecurePassword123!@#

# Environment
NODE_ENV=development
```

#### 4. Initialize Admin Account
```bash
npm run init-admin
```

#### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### First Steps After Setup

1. **Create Your Account**
   - Click "Get Started" or "Sign Up"
   - Enter email and password (minimum 6 characters)
   - Auto-logged in after registration

2. **Create Your First Habit**
   - **Quick Start**: Use a Preset (Weekday, Sunday, Gym, Diet)
   - **Custom**: Create a new habit with name, category, and steps

3. **Track Daily**
   - Dashboard → Check off completed habits
   - For multi-step habits, mark individual steps

4. **View Progress**
   - Analytics → See charts and completion rates
   - Filter by time period (7, 30, 90 days)

5. **Personalize Theme**
   - Dashboard → Themes → Select from 28 deadly dark themes
   - Apply → Theme persists across sessions

6. **Get AI Tips**
   - Dashboard shows personalized health, workout, and diet suggestions

---

## 🚀 Deployment Options

### Option 1: Oracle Cloud (Always Free - Recommended)

**Why Oracle Cloud:**
- ✅ Free forever (no expiration, no credit card)
- ✅ 2 VMs with 4 OCPUs each + 24GB RAM
- ✅ 200GB storage, 10TB outbound transfer
- ✅ Full root access

**Setup (10 Minutes):**

```bash
# 1. Create account at oracle.com/cloud/free (no CC required)
# 2. Create Ubuntu 22.04 VM instance
# 3. Add firewall rules for ports 22, 80, 443, 3000
# 4. SSH and run:

wget https://raw.githubusercontent.com/YOUR_USERNAME/daily_habit_tracker/main/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh

# Access:
# User: http://YOUR_PUBLIC_IP
# Admin: http://YOUR_PUBLIC_IP/admin/login
```

### Option 2: Vercel (Easiest for Next.js)

```bash
# 1. Push to GitHub
git add . && git commit -m "Deploy" && git push

# 2. vercel.com → Import GitHub repo
# 3. Add environment variables
# 4. Deploy!
```

### Option 3: Railway

```bash
# 1. vercel.com → Create project
# 2. Connect GitHub repo
# 3. Add environment variables
# 4. Auto-deploys on push
```

### Option 4: Render

```bash
# 1. Dashboard → New Service → GitHub
# 2. Build: npm install && npm run build
# 3. Start: npm start
# 4. Add environment variables
```

---

## Environment Variables

### Local Development (`.env.local`)
```env
MONGODB_URI=mongodb://localhost:27017/habit-tracker
JWT_SECRET=your-secret-key-64-chars-minimum
ADMIN_JWT_SECRET=your-admin-secret-key-different-from-above
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=YourSecurePassword123!@#
NODE_ENV=development
```

### Production
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/habit-tracker
JWT_SECRET=generate-with-node-crypto-strong-32-chars-min
ADMIN_JWT_SECRET=different-key-for-admin-tokens
ADMIN_EMAIL=your-secure-admin-email@domain.com
ADMIN_PASSWORD=very-strong-password-24-chars-min
NODE_ENV=development
# DO NOT SET PORT - let platform assign
```

**Generate secure keys:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔐 Admin Access

### Admin Login
- **URL**: `/admin/login`
- **Email**: From `.env.local` ADMIN_EMAIL
- **Password**: From `.env.local` ADMIN_PASSWORD

### Admin Dashboard (`/admin/dashboard`)
- **Total Users Count**: Real-time user statistics
- **Habits Overview**: Total habits, average per user
- **Completion Analytics**: Daily completion rates
- **Top Performing Habits**: Most tracked habits
- **Category Distribution**: Habits by category breakdown
- **User Management**: View and manage all users
- **Theme Management**: Create/edit/delete themes
- **Seed Deadly Themes**: One-click seeding of 28 dark themes

### Admin Features
- 📊 Advanced analytics and statistics
- 👥 User management and role assignment
- 🎨 Theme creation and customization
- 🖼️ Image upload for theme customization
- 🔑 Password reset functionality
- 📈 Performance tracking

### Admin Security
- ✅ Separate admin JWT token (different secret)
- ✅ Account lockout after 5 failed attempts (30 min)
- ✅ Password hashing with 15 bcrypt salt rounds
- ✅ Secure password reset with token validation
- ✅ Admin-only middleware on sensitive endpoints

---

## 🎨 Themes System

### Theme Features

#### 28 Deadly Dark Themes
Each theme includes:
- **Primary Color**: Main accent color (red/crimson variants)
- **Secondary Color**: Supporting color
- **Accent Color**: Highlights and emphasis
- **Background**: Dark base color
- **Surface**: Card/component background
- **Text Colors**: Primary and secondary text
- **Status Colors**: Success, warning, error, info
- **Optional Images**: Background and accent images (admin-only)

#### Available Themes
```
Blood Night, Crimson Void, Midnight Scarlet, Obsidian Rage, Devil Black,
Shadow Crimson, Inferno Black, Nightmare Red, Volcanic Night, Abyss Scarlet,
Phantom Crimson, Eclipse Red, Void Blood, Raven Scarlet, Midnight Flame,
Shadow Inferno, Onyx Passion, Whisper Crimson, Coal Ruby, Dusk Crimson,
Twilight Scarlet, Ebony Blaze, Night Ember, Abyss Ruby, Pitch Vermillion,
Onyx Scarlet, Void Scarlet, Shadow Fury, Midnight Inferno, Eclipse Crimson,
Obsidian Crimson, and more...
```

### User Theme Selection

#### For Users
1. **Navigate**: Dashboard → Themes
2. **Browse**: View all 28 available themes
3. **Apply**: Click theme to apply instantly
4. **Revert**: Click "Revert to Default Theme" anytime

#### For Admins
1. **Upload Images**: Add background and accent images
2. **Create Themes**: Custom color combinations
3. **Edit Themes**: Modify existing theme properties
4. **Seed Themes**: Create all 28 default themes at once
5. **Delete Themes**: Remove unwanted themes

### Theme Persistence
- User's selected theme stored in profile
- Applies automatically on login
- Stored as theme name or ID in database
- Default theme returned if user theme not found
- Real-time CSS application via custom properties

### API Endpoints
- `GET /api/themes` - Get all themes
- `GET /api/themes/[id]` - Get specific theme
- `POST /api/themes` - Create theme (admin-only)
- `PUT /api/themes/[id]` - Update theme (admin-only)
- `DELETE /api/themes/[id]` - Delete theme (admin-only)
- `GET /api/users/theme` - Get user's selected theme
- `PUT /api/users/theme` - Set user's theme
- `POST /api/admin/themes/upload-image` - Upload theme image (admin-only)

---

## 📊 API Endpoints

### Authentication
```
POST   /api/auth/register              - Register new user
POST   /api/auth/login                 - Login with email/username
POST   /api/auth/logout                - Logout (clear cookie)
POST   /api/auth/check-user            - Check if username/email exists
```

### Habits
```
GET    /api/habits                     - Get user's all habits
POST   /api/habits                     - Create new habit
PUT    /api/habits/[id]                - Update habit
DELETE /api/habits/[id]                - Delete habit
POST   /api/habits/reorder             - Reorder habits
```

### Daily Logs
```
GET    /api/logs                       - Get user's daily logs
POST   /api/logs                       - Create/update daily log
```

### Presets
```
GET    /api/presets                    - Get available presets
POST   /api/presets                    - Apply preset to create habits
GET    /api/presets?type=gym           - Get presets by type
```

### Analytics
```
GET    /api/analytics                  - Get user's analytics data
GET    /api/analytics?days=30          - Get analytics for specific period
```

### AI Coach
```
GET    /api/ai-coach                   - Get personalized health tips
```

### Themes
```
GET    /api/themes                     - Get all public themes
POST   /api/themes                     - Create theme (admin)
PUT    /api/themes/[id]                - Update theme (admin)
DELETE /api/themes/[id]                - Delete theme (admin)
GET    /api/users/theme                - Get user's selected theme
PUT    /api/users/theme                - Apply theme to user
POST   /api/admin/themes/upload-image  - Upload theme image (admin)
```

### Admin
```
POST   /api/admin/login                - Admin login
POST   /api/admin/logout               - Admin logout
POST   /api/admin/reset-password       - Reset admin password
GET    /api/admin/stats                - Admin statistics
GET    /api/admin/users                - Admin user management
GET    /api/admin/users/[id]           - Get specific user
PUT    /api/admin/users/[id]           - Update user (admin)
DELETE /api/admin/users/[id]           - Delete user (admin)
POST   /api/admin/seed/                - Seed themes (admin)
```

---

## 🏗️ Project Structure

```
daily_habit_tracker/
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes
│   │   ├── auth/                     # Authentication endpoints
│   │   ├── habits/                   # Habit management
│   │   ├── logs/                     # Daily logs
│   │   ├── presets/                  # Habit presets
│   │   ├── analytics/                # Analytics data
│   │   ├── ai-coach/                 # AI tips
│   │   ├── themes/                   # Theme management
│   │   ├── users/theme/              # User theme preference
│   │   └── admin/                    # Admin endpoints
│   ├── (auth)/                       # Authentication pages
│   │   ├── login/                    # Login page
│   │   └── register/                 # Registration page
│   ├── admin/                        # Admin pages
│   │   ├── dashboard/                # Admin dashboard
│   │   ├── login/                    # Admin login
│   │   ├── themes/                   # Theme management UI
│   │   └── users/                    # User management UI
│   ├── dashboard/                    # User dashboard pages
│   │   ├── page.tsx                  # Dashboard home
│   │   ├── habits/                   # Habits page
│   │   ├── analytics/                # Analytics page
│   │   └── themes/                   # User theme selection
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Home page
├── components/                       # React components
│   ├── Navbar.tsx                    # Navigation bar
│   ├── ThemeProvider.tsx             # Theme application
│   ├── ThemeSelector.tsx             # User theme selector
│   ├── HabitCard.tsx                 # Habit display card
│   ├── HabitStats.tsx                # Habit statistics
│   ├── AICoach.tsx                   # AI tips component
│   ├── AchievementBadges.tsx         # Achievement badges
│   ├── WeeklyCalendar.tsx            # Week view
│   ├── ColorPicker.tsx               # Color selection UI
│   ├── ThemeDemo.tsx                 # Theme preview
│   ├── DeleteConfirmModal.tsx        # Confirmation modal
│   └── ...
├── lib/                              # Utilities and logic
│   ├── mongodb.ts                    # Database connection
│   ├── auth.ts                       # JWT and password functions
│   ├── admin-auth.ts                 # Admin authentication
│   ├── middleware.ts                 # Auth middleware
│   ├── admin-middleware.ts           # Admin middleware
│   ├── ai-coach.ts                   # AI tips generation
│   ├── security.ts                   # Security utilities
│   ├── db-init.ts                    # Database initialization
│   ├── utils.ts                      # General utilities
│   ├── models/                       # Mongoose schemas
│   │   ├── User.ts                   # User model
│   │   ├── Admin.ts                  # Admin model
│   │   ├── Habit.ts                  # Habit model
│   │   ├── DailyLog.ts               # Daily log model
│   │   ├── Preset.ts                 # Preset model
│   │   ├── Theme.ts                  # Theme model
│   │   ├── Template.ts               # Template model
│   │   └── ...
│   ├── seed-themes-simple.ts         # Simple theme seeding
│   ├── seed-deadly-themes.ts         # Deadly themes seeding
│   ├── init-admin.ts                 # Admin initialization
│   └── ...
├── types/                            # TypeScript interfaces
│   └── index.ts                      # Type definitions
├── public/                           # Static assets
│   └── ...
├── .env.local                        # Environment variables
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── tailwind.config.js                # Tailwind CSS config
├── next.config.js                    # Next.js config
└── README.md                         # Documentation
```

---

## 🗄️ Database Schema

### User Collection
```typescript
{
  _id: ObjectId,
  email: string (unique, lowercase),
  username: string (unique),
  passwordHash: string,
  passwordStrength: string,
  createdAt: Date,
  updatedAt: Date,
  preferredTheme: string, // Theme name or ID
  lastLogin: Date,
  isActive: boolean,
  loginAttempts: number,
  lastAttemptTime: Date,
  lockoutUntil: Date
}
```

### Habit Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  name: string,
  category: string,
  type: 'single-step' | 'multi-step',
  steps: [
    {
      name: string,
      description: string,
      completed: boolean
    }
  ],
  targetPerDay: number,
  schedule: {
    type: 'daily' | 'weekdays' | 'weekends',
    days: string[]
  },
  order: number,
  createdAt: Date,
  updatedAt: Date
}
```

### Theme Collection
```typescript
{
  _id: ObjectId,
  name: string (unique),
  displayName: string,
  description: string,
  isDefault: boolean,
  isCustom: boolean,
  category: string,
  colors: {
    primary: string,
    secondary: string,
    accent: string,
    background: string,
    surface: string,
    text: string,
    textSecondary: string,
    border: string,
    success: string,
    warning: string,
    error: string,
    info: string
  },
  backgroundImage?: string,
  accentImage?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### DailyLog Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  habitId: ObjectId,
  date: Date,
  completed: boolean,
  stepsCompleted: number,
  notes: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for prod
npm start            # Start prod server
npm run init-admin   # Initialize admin account
npm run seed         # Seed database with default data
```

### Development Tools
- TypeScript for type safety
- ESLint for code quality
- Tailwind CSS for styling
- MongoDB Compass for database inspection
- Thunder Client / Postman for API testing

### Code Standards
- TypeScript strict mode enabled
- Component-based architecture
- Utility function separation
- Error handling on all async operations
- Loading states for API calls

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
sudo systemctl status mongod

# If not running, start it
sudo systemctl start mongod

# Check connection string in .env.local
MONGODB_URI=mongodb://localhost:27017/habit-tracker
```

### Admin Account Issues
```bash
# Reinitialize admin account
npm run init-admin

# Check MongoDB for admin record
# Use MongoDB Compass or mongo CLI
```

### Theme Not Applying
1. Clear browser cache
2. Check developer console for errors
3. Verify theme exists in database
4. Ensure user is authenticated

### API 404 Errors
1. Check if user is authenticated
2. Verify Authorization cookie is being sent
3. Check API route file exists at correct path
4. Look at server logs for error details

---

## 📈 Future Roadmap

- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Social features (friends, challenges)
- [ ] Integration with fitness trackers
- [ ] Advanced AI personalization
- [ ] Habit templates marketplace
- [ ] Data export (CSV, PDF)
- [ ] Dark/light theme system expansion

---

## 📝 License

This project is provided as-is for personal and educational use.

---

## 🤝 Support

For issues and questions:
1. Check troubleshooting section
2. Review API documentation
3. Check MongoDB connection
4. Ensure all environment variables are set correctly
5. Clear cache and restart dev server

---

**Last Updated**: December 27, 2025
**Status**: Production Ready
**Version**: 1.0.0
