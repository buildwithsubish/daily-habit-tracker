#!/bin/bash

# WhatsApp Scheduler Auto-Start Script
# This script initializes the WhatsApp scheduler when the app starts

echo "🚀 Starting Habitflow with WhatsApp Scheduler..."

# Start the Next.js dev server in the background
npm run dev &
DEV_PID=$!

echo "⏳ Waiting for server to start..."
sleep 5

# Try to initialize the scheduler
echo "🔄 Initializing WhatsApp Scheduler..."
max_attempts=5
attempt=1

while [ $attempt -le $max_attempts ]; do
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/startup)
  
  if [ "$response" = "200" ]; then
    echo "✅ WhatsApp Scheduler initialized successfully!"
    break
  else
    echo "⚠️  Attempt $attempt/$max_attempts failed (HTTP $response). Retrying in 2 seconds..."
    sleep 2
    attempt=$((attempt + 1))
  fi
done

if [ $attempt -gt $max_attempts ]; then
  echo "⚠️  Failed to initialize scheduler after $max_attempts attempts"
  echo "   The app is running, but scheduler may need manual initialization"
  echo "   POST http://localhost:3000/api/startup to initialize"
fi

echo ""
echo "📱 Habitflow is running!"
echo "🌐 Open http://localhost:3000 in your browser"
echo ""

# Keep the script running
wait $DEV_PID
