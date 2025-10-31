#!/bin/bash
# Railway Deployment Script for Beat the Deck Leaderboard API

echo "🚀 Deploying to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm i -g @railway/cli
fi

# Navigate to backend directory
cd "$(dirname "$0")"

# Step 1: Login to Railway (if not already logged in)
echo "Step 1: Checking Railway login status..."
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway..."
    railway login
else
    echo "✓ Already logged in to Railway"
    railway whoami
fi

echo ""

# Step 2: Initialize or link project
echo "Step 2: Setting up Railway project..."
if [ ! -f "railway.json" ] && [ ! -f ".railway" ]; then
    echo "Initializing new Railway project..."
    railway init
else
    echo "✓ Project already initialized"
fi

echo ""

# Step 3: Set MongoDB URI
echo "Step 3: Setting MongoDB URI environment variable..."
if [ -f ".env" ]; then
    MONGODB_URI=$(grep MONGODB_URI .env | cut -d '=' -f2-)
    if [ -n "$MONGODB_URI" ]; then
        echo "Setting MONGODB_URI from .env file..."
        railway variables set MONGODB_URI="$MONGODB_URI"
        echo "✓ MONGODB_URI set"
    else
        echo "⚠️  MONGODB_URI not found in .env file"
        echo "Please set it manually: railway variables set MONGODB_URI=your_connection_string"
    fi
else
    echo "⚠️  .env file not found"
    echo "Please set MONGODB_URI manually: railway variables set MONGODB_URI=your_connection_string"
fi

echo ""

# Step 4: Deploy
echo "Step 4: Deploying to Railway..."
echo "This may take a few minutes..."
railway up

echo ""
echo "✓ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Get your deployment URL from: railway domain"
echo "2. Update API_BASE_URL in ../script.js with your Railway URL"
echo ""

