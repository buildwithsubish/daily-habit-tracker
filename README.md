# Daily Habit Tracker

A comprehensive web-based habit tracker with daily reminders, multi-step habits, visual progress dashboards, AI-driven motivation, per-user themes, WhatsApp integration, and health tips.

## 🚀 Features

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

### WhatsApp Integration
- **Phone Verification**: 6-digit code verification via WhatsApp
- **Automated Reminders**: Daily summaries and scheduled reminders
- **Message Scheduling**: 08:00 AM daily summary, 10:00 AM/2:00 PM/7:00 PM reminders
- **Status Tracking**: Message delivery status with retry logic
- **Admin Dashboard**: WhatsApp session management and broadcasting

### Theme System
- **28 Dark Themes**: Black and red color combinations
- **Per-User Selection**: Each user can apply their own theme
- **Admin Customization**: Upload custom background and accent images
- **Real-time Application**: Themes apply instantly without reload

### Security Features
- **Enhanced Password Security**: 12 bcrypt salt rounds
- **XSS Protection**: Input sanitization on all user inputs
- **CSRF Prevention**: Secure cookie handling
- **Admin Access Control**: Separate admin authentication
- **Account Lockout**: 5 failed attempts trigger 30-minute lockout

## 🛠 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 14.2.35, React, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication** | JWT, bcryptjs |
| **WhatsApp** | Twilio/Meta Business API |
| **UI Components** | Lucide React Icons |
| **Charts** | Recharts |
| **Drag & Drop** | dnd-kit |

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and Install**
```bash
git clone <your-repo-url>
cd daily_habit_tracker
npm install
```

2. **Set Up MongoDB**
   
   **MongoDB Atlas (Recommended):**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create free M0 cluster
   - Create database user
   - Allow 0.0.0.0/0 in Network Access
   - Copy connection string

   **Local MongoDB:**
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod
```

3. **Environment Configuration**
   
   Create `.env.local`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/habit-tracker

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-in-production
ADMIN_JWT_SECRET=your-different-admin-secret-key-min-32-chars

# Admin Account
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=YourSuperSecurePassword123!@#

# WhatsApp Integration (Optional)
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=+1234567890
CRON_SECRET=your-secret-key

# Environment
NODE_ENV=development
```

4. **Initialize Admin Account**
```bash
npm run init-admin
```

5. **Start Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🌐 Deployment

### Oracle Cloud (Always Free - Recommended)
```bash
# 1. Create account at oracle.com/cloud/free (no CC required)
# 2. Create Ubuntu 22.04 VM instance
# 3. Add firewall rules for ports 22, 80, 443, 3000
# 4. SSH and run setup script
```

### Vercel (Easiest for Next.js)
```bash
# 1. Push to GitHub
git add . && git commit -m "Deploy" && git push

# 2. vercel.com → Import GitHub repo
# 3. Add environment variables
# 4. Deploy!
```

### Other Platforms
- **Railway**: Auto-deploys on push
- **Render**: Full stack deployment
- **DigitalOcean**: Droplet with Docker

## 🔐 Admin Access

### Admin Login
- **URL**: `/admin/login`
- **Email**: From `.env.local` ADMIN_EMAIL
- **Password**: From `.env.local` ADMIN_PASSWORD

### Admin Features
- **User Management**: View and manage all users
- **Analytics**: Advanced statistics and performance tracking
- **Theme Management**: Create/edit/delete themes
- **WhatsApp Integration**: Session management and broadcasting
- **Password Reset**: Secure admin password recovery

## 📱 WhatsApp Integration

### Setup
1. Configure Twilio or Meta Business API credentials
2. Users verify phone numbers via 6-digit code
3. Enable automated reminders and daily summaries

### Features
- **Phone Verification**: Secure verification flow
- **Message Scheduling**: Automated reminders at set times
- **Status Tracking**: Monitor message delivery
- **Retry Logic**: Automatic retry for failed messages
- **Admin Broadcasting**: Send messages to multiple users one-by-one

### Admin Broadcasting
The broadcast system sends messages to users one-by-one with proper verification:
- **Pre-Flight Checks**: Verifies WhatsApp is connected before starting
- **Individual Delivery**: Each message is sent individually with status tracking
- **Failure Logging**: Failed messages are logged with specific error reasons
- **Detailed Results**: Returns per-user success/failure status
- **Health Endpoint**: Check broadcast readiness at `/api/admin/whatsapp/broadcast-health`

### API Endpoints
```
POST /api/whatsapp/verify-number           - Send/verify code
GET  /api/whatsapp/message-history         - View message history
POST /api/send-whatsapp-message            - Send manual message
POST /api/admin/whatsapp/broadcast         - Send broadcast to users
GET  /api/admin/whatsapp/broadcast-health  - Check broadcast system health
```

### Troubleshooting Broadcasts
If broadcasts show as "sent" but aren't delivering:
1. Run: `curl http://localhost:3000/api/admin/whatsapp/broadcast-health`
2. Verify WhatsApp is **connected** at `/admin/whatsapp`
3. Ensure Python server is running: `python whatsapp_server.py`
4. Check users have WhatsApp enabled in their settings
5. See [BROADCAST_DEBUG_GUIDE.md](./BROADCAST_DEBUG_GUIDE.md) for detailed debugging

## 🎨 Theme System

### Available Themes
28 deadly dark themes including:
- Blood Night, Crimson Void, Midnight Scarlet
- Obsidian Rage, Devil Black, Shadow Crimson
- Inferno Black, Nightmare Red, Volcanic Night
- And more...

### User Theme Selection
1. Navigate to Dashboard → Themes
2. Browse and select from available themes
3. Apply instantly - persists across sessions
4. Revert to default theme anytime

## 📊 API Endpoints

### Authentication
```
POST /api/auth/register      - Register new user
POST /api/auth/login         - Login with email/username
POST /api/auth/logout        - Logout (clear cookie)
```

### Habits
```
GET    /api/habits           - Get user's habits
POST   /api/habits           - Create new habit
PUT    /api/habits/[id]      - Update habit
DELETE /api/habits/[id]      - Delete habit
POST   /api/habits/reorder   - Reorder habits
```

### Analytics
```
GET /api/analytics           - Get user analytics
GET /api/analytics?days=30  - Get analytics for period
```

### Admin
```
POST /api/admin/login        - Admin login
GET  /api/admin/stats        - Admin statistics
GET  /api/admin/users        - User management
```

## 🏗 Project Structure

```
daily_habit_tracker/
├── app/                     # Next.js App Router
│   ├── api/                 # API Routes
│   ├── (auth)/              # Authentication pages
│   ├── admin/               # Admin pages
│   ├── dashboard/           # User dashboard
│   └── globals.css          # Global styles
├── components/              # React components
├── lib/                     # Utilities and logic
│   ├── models/              # Mongoose schemas
│   ├── auth.ts              # JWT functions
│   └── whatsapp.ts          # WhatsApp integration
├── types/                   # TypeScript interfaces
└── public/                  # Static assets
```

## 🗄 Database Schema

### User Collection
```typescript
{
  _id: ObjectId,
  email: string (unique),
  username: string (unique),
  passwordHash: string,
  preferredTheme: string,
  whatsappNumber?: string,
  whatsappVerified: boolean,
  createdAt: Date,
  updatedAt: Date
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
  steps: [{ name: string, completed: boolean }],
  targetPerDay: number,
  schedule: { type: string, days: string[] },
  order: number,
  createdAt: Date
}
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start if not running
sudo systemctl start mongod

# Verify connection string
MONGODB_URI=mongodb://localhost:27017/habit-tracker
```

### WhatsApp Issues
- Check Twilio credentials in `.env.local`
- Verify phone number format (+countrycode)
- Check server logs for `[WhatsApp]` messages

### Common Issues
- **Build fails**: Check TypeScript errors
- **Login not working**: Verify JWT secrets
- **Theme not applying**: Clear browser cache

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run init-admin   # Initialize admin account
npm run seed         # Seed database with themes
```

## 🔧 Development Tools

- **TypeScript**: Type safety
- **ESLint**: Code quality
- **Tailwind CSS**: Styling
- **MongoDB Compass**: Database inspection
- **Postman**: API testing

## 📈 Future Roadmap

- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Social features (friends, challenges)
- [ ] Integration with fitness trackers
- [ ] Advanced AI personalization
- [ ] Habit templates marketplace

## 🤝 Support

For issues and questions:
1. Check troubleshooting section
2. Review API documentation
3. Verify environment variables
4. Clear cache and restart server

---

**Last Updated**: February 2026  
**Status**: Production Ready  
**Version**: 1.0.0

---

## 📄 License

This project is provided as-is for personal and educational use.
