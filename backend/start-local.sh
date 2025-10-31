#!/bin/bash
# Start the backend server for local/staging development

echo "🚀 Starting Beat the Deck Leaderboard API for local development..."
echo ""

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating .env from template..."
    cat > .env << EOF
MONGODB_URI=mongodb+srv://richiebramley_db_user:xZb1nn7INiQBRcqH@btd.ejdl8qt.mongodb.net/?appName=BTD
PORT=3000
EOF
    echo "✓ .env file created"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔌 Starting server..."
echo "Server will be available at: http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

npm start

