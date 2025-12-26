#!/bin/bash

# Quick Deployment Script for Oracle Cloud / Any Linux Server
# Run this script on your server after initial setup

echo "🚀 Starting deployment..."

# Navigate to project directory
cd daily_habit_tracker || exit

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build application
echo "🔨 Building application..."
npm run build

# Initialize admin (if not exists)
echo "👤 Initializing admin account..."
npm run init-admin || echo "Admin already exists"

# Restart application with PM2
echo "🔄 Restarting application..."
pm2 restart habit-tracker || pm2 start npm --name "habit-tracker" -- start

# Save PM2 configuration
pm2 save

echo "✅ Deployment completed successfully!"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs habit-tracker"

