# Beat the Deck - Leaderboard API

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend` directory with your MongoDB Atlas connection string:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
PORT=3000
```

### 3. Run Locally
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### 4. Deploy to Railway

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Initialize a new project in the backend directory:
   ```bash
   cd backend
   railway init
   ```

4. Add MongoDB environment variable:
   ```bash
   railway variables set MONGODB_URI=your_mongodb_connection_string
   ```

5. Deploy:
   ```bash
   railway up
   ```

6. Get your deployment URL from Railway dashboard and update `API_BASE_URL` in `script.js`

## API Endpoints

### POST /api/score
Submit a game score.

**Request Body:**
```json
{
  "username": "Player_123",
  "stacksRemaining": 4,
  "longestStreak": 9,
  "remainingCards": 0,
  "result": "win"
}
```

**Response:**
```json
{
  "message": "Score saved successfully"
}
```

### GET /api/leaderboard
Get top 50 leaderboard entries sorted by:
1. Winners before losers
2. Highest stacksRemaining
3. Highest longestStreak
4. Lowest remainingCards
5. Most recent timestamp

**Response:**
```json
[
  {
    "username": "Player_123",
    "stacksRemaining": 9,
    "longestStreak": 54,
    "remainingCards": 0,
    "result": "win",
    "timestamp": 1234567890
  },
  ...
]
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

