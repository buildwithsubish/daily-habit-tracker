#!/bin/bash

# Complete Server Setup Script for Oracle Cloud / Ubuntu
# Run this once on a fresh Ubuntu server

echo "🔧 Setting up Habit Tracker Server..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install Git
echo "📦 Installing Git..."
sudo apt install -y git

# Install MongoDB (Optional - can use MongoDB Atlas instead)
read -p "Install MongoDB locally? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "📦 Installing MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt update
    sudo apt install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
    echo "✅ MongoDB installed and started"
else
    echo "⏭️  Skipping MongoDB installation. Use MongoDB Atlas instead."
fi

# Install Certbot for SSL
echo "📦 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Clone repository (if not already cloned)
if [ ! -d "daily_habit_tracker" ]; then
    echo "📥 Cloning repository..."
    read -p "Enter your GitHub repository URL: " repo_url
    git clone $repo_url daily_habit_tracker
fi

cd daily_habit_tracker || exit

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/habit-tracker
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_EMAIL=admin@habittracker.com
ADMIN_PASSWORD=ChangeThisPassword123!@#
NODE_ENV=production
PORT=3000
EOF
    echo "✅ .env file created. Please edit it with your settings: nano .env"
fi

# Build application
echo "🔨 Building application..."
npm run build

# Initialize admin
echo "👤 Initializing admin account..."
npm run init-admin

# Setup PM2
echo "⚙️  Setting up PM2..."
pm2 start npm --name "habit-tracker" -- start
pm2 save
pm2 startup

echo ""
echo "✅ Server setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file: nano .env"
echo "2. Configure Nginx (see deployment guide)"
echo "3. Setup firewall rules"
echo "4. Your app should be running on port 3000"
echo ""
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs habit-tracker"

