<<<<<<< HEAD
# habit-tracker



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.com/maariselvaraj99/habit-tracker.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

* [Set up project integrations](https://gitlab.com/maariselvaraj99/habit-tracker/-/settings/integrations)

## Collaborate with your team

* [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
* [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
* [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
* [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
* [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
=======
# Daily Habit Tracker

A comprehensive web-based habit tracker with daily reminders, multi-step habits, visual progress dashboards, AI-driven motivation, and health tips.

## Features

- **User Authentication**: Secure email/password authentication
- **Habit Management**: Create single-step or multi-step habits with categories
- **Daily Tracking**: Check-in system with progress tracking
- **Presets**: Pre-configured weekday, Sunday, gym, and diet routines
- **Dashboard**: Visual analytics with charts and progress metrics
- **AI Coach**: Personalized health tips for diet, hydration, and workouts
- **Streaks**: Configurable streak tracking for motivation
- **Notifications**: Daily reminders and completion prompts

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcrypt (12 salt rounds for enhanced security)
- **Security**: Input sanitization, XSS protection, password strength validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: Custom CSS animations with glassmorphism effects
- **Responsive**: Fully mobile-adaptive UI with drag-and-drop reordering

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18 or higher
- MongoDB (local or Atlas)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd daily_habit_tracker
npm install
```

2. **Set up MongoDB:**
   - Install MongoDB locally, or
   - Use MongoDB Atlas (cloud)
   - Create a `.env.local` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/habit-tracker
   JWT_SECRET=your-secret-key-change-in-production
   ADMIN_JWT_SECRET=your-admin-secret-key-different-from-above
   ADMIN_EMAIL=admin@habittracker.com
   ADMIN_PASSWORD=YourSuperSecurePassword123!@#
   NODE_ENV=development
   ```

3. **Initialize Admin Account:**
```bash
npm run init-admin
```

4. **Run the development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

### First Steps

1. **Create Your Account:**
   - Click "Get Started" or "Sign Up"
   - Enter email and password (minimum 6 characters)
   - You'll be automatically logged in

2. **Create Your First Habit:**
   - **Use a Preset** (recommended): Choose from Weekday Routine, Sunday Routine, Gym Routine, Diet Guidelines
   - **Create Custom**: Fill in habit name, category, and type (single-step or multi-step)

3. **Track Daily:**
   - Go to Dashboard
   - Check off completed habits
   - For multi-step habits, check individual steps

4. **View Progress:**
   - Click "Analytics" for charts and streaks
   - Filter by time period (7, 30, 90 days)

5. **Get AI Tips:**
   - Dashboard shows personalized health, workout, and diet suggestions

## 🚀 Deployment Options

### Option 1: Oracle Cloud Always Free (Recommended - 100% Free Forever)

**Why Oracle Cloud:**
- ✅ 2 Free VMs (Always Free Forever)
- ✅ 200GB Storage (Free Forever)
- ✅ 10TB Outbound Data Transfer (Free Forever)
- ✅ No Credit Card Required
- ✅ No Expiration
- ✅ Full Root Access

#### Quick Setup (10 Minutes):

1. **Create Account (2 min):**
   - Go to https://www.oracle.com/cloud/free/
   - Sign up (no credit card needed)
   - Verify email

2. **Create Server (3 min):**
   - Login to https://cloud.oracle.com
   - Compute → Instances → Create Instance
   - Name: `habit-tracker`
   - Image: Ubuntu 22.04
   - Shape: VM.Standard.A1.Flex (4 OCPUs, 24GB RAM - Free)
   - Download SSH key as `oracle-key.pem`

3. **Open Firewall (1 min):**
   - Networking → Virtual Cloud Networks → Your VCN → Security Lists → Default Security List
   - Add Ingress Rules: Source `0.0.0.0/0`, Ports `22,80,443,3000`

4. **Connect & Setup (4 min):**
   ```bash
   chmod 400 oracle-key.pem
   ssh -i oracle-key.pem ubuntu@YOUR_PUBLIC_IP

   # On server:
   wget https://raw.githubusercontent.com/YOUR_USERNAME/daily_habit_tracker/main/setup-server.sh
   chmod +x setup-server.sh
   ./setup-server.sh
   ```

5. **Access Your App:**
   - User: `http://YOUR_PUBLIC_IP`
   - Admin: `http://YOUR_PUBLIC_IP/admin/login`

#### Manual Setup (If script fails):
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt install -y nginx

# Clone and setup
git clone https://github.com/YOUR_USERNAME/daily_habit_tracker.git
cd daily_habit_tracker
npm install
npm run build

# Create .env
nano .env
# Add your environment variables

# Start app
pm2 start npm --name "habit-tracker" -- start
pm2 save

# Configure Nginx
sudo nano /etc/nginx/sites-available/habit-tracker
# Add nginx config (see below)
sudo ln -s /etc/nginx/sites-available/habit-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name YOUR_PUBLIC_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Vercel (Easiest Next.js Deployment)

1. **Push to GitHub:**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Deploy on Vercel:**
   - Go to vercel.com
   - Import your GitHub repo
   - Add environment variables
   - Deploy!

### Option 3: Railway (Simple Auto-Deploy)

1. **Push to GitHub**
2. **Railway Dashboard:**
   - New Project → Deploy from GitHub
   - Select repo
   - Add environment variables
   - Auto-deploys!

### Option 4: Render (Free Tier)

1. **Connect GitHub repo**
2. **Configure:**
   - Environment: Node
   - Build: `npm install && npm run build`
   - Start: `npm start`
3. **Add environment variables**
4. **Deploy**

## 🗄️ MongoDB Setup

### MongoDB Atlas (Recommended - Free):
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free M0 cluster
3. Create database user
4. Network Access: Allow 0.0.0.0/0
5. Get connection string:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/habit-tracker?retryWrites=true&w=majority
   ```

### Local MongoDB:
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Connection string: mongodb://localhost:27017/habit-tracker
```

## 🔐 Environment Variables

Create `.env.local` (local) or add in hosting platform:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/habit-tracker
# OR: mongodb+srv://user:pass@cluster.mongodb.net/habit-tracker

# JWT Secrets (64+ chars, generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ADMIN_JWT_SECRET=your-super-secret-admin-jwt-key-different-from-above

# Admin Credentials
ADMIN_EMAIL=admin@habittracker.com
ADMIN_PASSWORD=YourSuperSecurePassword123!@#Min12Chars

# Environment
NODE_ENV=production  # or development
PORT=3000  # optional, defaults to 3000
```

## 🔒 Admin Access

- **Admin Login**: `/admin/login`
- **Admin Dashboard**: `/admin/dashboard`
- **Password Reset**: `/admin/reset-password`

**Admin Features:**
- Total users and habits monitoring
- Completion rate analytics
- Daily activity charts
- Top performing habits
- Category distribution

**Security:**
- Separate admin authentication (15 bcrypt rounds)
- Account lockout after 5 failed attempts (30 min)
- Secure password reset with token-based system
- Separate JWT secret for admin tokens

## 📊 API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/habits` - Get user's habits
- `POST /api/habits` - Create new habit
- `PUT /api/habits/[id]` - Update habit
- `DELETE /api/habits/[id]` - Delete habit
- `GET /api/logs` - Get daily logs
- `POST /api/logs` - Create/update log entry
- `GET /api/presets` - Get available presets
- `POST /api/presets` - Apply preset to create habits
- `GET /api/analytics` - Get analytics data
- `GET /api/ai-coach` - Get AI-generated tips
- `POST /api/admin/login` - Admin login
- `GET /api/admin/stats` - Admin statistics
- `GET /api/admin/users` - Admin user management
- `POST /api/admin/reset-password` - Admin password reset

## 🏗️ Project Structure

```
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── (auth)/         # Authentication pages
│   ├── dashboard/      # Dashboard pages
│   └── layout.tsx      # Root layout
├── components/          # React components
├── lib/                # Utilities and database
├── types/              # TypeScript types
└── public/             # Static assets
```

## 🗃️ Database Schema

- **Users**: Authentication and preferences
- **Admins**: Admin accounts
- **Habits**: Habit definitions with steps
- **DailyLogs**: Daily completion tracking
- **Presets**: Pre-configured habit templates

## 🔄 Development Roadmap

- [x] Phase 1: MVP (Authentication, Habit Creation, Basic Tracking)
- [x] Phase 2: AI Integration and Personalization
- [x] Phase 3: Advanced Analytics
- [ ] Phase 4: Mobile Optimization and Offline Support
- [ ] Phase 5: Notifications and Reminders (Web Push)

## Key Features Implemented

### Authentication
- Email/username login (flexible identifier)
- JWT-based session management
- Enhanced password security (12 salt rounds, strength validation)
- Input sanitization and XSS protection

### Habit Management
- Create single-step habits
- Create multi-step habits with progress tracking
- Organize habits by category (Health, Productivity, Mindfulness, Fitness, Diet)
- Edit and delete habits

### Daily Tracking
- Daily check-in interface
- Track completion for single and multi-step habits
- View progress for any date
- Visual progress indicators

### Presets
- **Weekday Routine**: Morning routine with meditation, exercise, reading, etc.
- **Sunday Routine**: Weekend-focused activities
- **Gym Routine**: 5-day workout split (Push, Pull, Legs, Mobility, Full Body)
- **Diet Guidelines**: Hydration tracking, protein, fiber, and balanced meals
- **Bulking Diet Plan**: High-calorie meal plan for muscle gain
- **Lean Bulk Diet Plan**: Controlled surplus diet for lean muscle growth

### Analytics Dashboard
- Completion rate over time (line chart)
- Per-habit performance (bar chart)
- Streak tracking (current and longest streaks)
- Filterable by time period (7, 30, 90 days)

### Habit Management
- Drag-and-drop reordering of habits
- Custom order persistence
- Visual feedback with smooth animations

## Environment Setup

Create a `.env.local` file (optional for development):
```
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

The database (SQLite) will be automatically created on first run at `habits.db`.

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/habits` - Get user's habits
- `POST /api/habits` - Create new habit
- `PUT /api/habits/[id]` - Update habit
- `DELETE /api/habits/[id]` - Delete habit
- `GET /api/logs` - Get daily logs
- `POST /api/logs` - Create/update log entry
- `GET /api/presets` - Get available presets
- `POST /api/presets` - Apply preset to create habits
- `GET /api/analytics` - Get analytics data
- `GET /api/ai-coach` - Get AI-generated tips

