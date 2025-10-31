# Quick Check: Railway MongoDB Connection

## What You Should See in Railway Logs

When the backend starts successfully, you should see:
```
==================================================
Beat the Deck Leaderboard API
==================================================
PORT: [some port number]
NODE_ENV: production (or not set)
MONGODB_URI: SET (hidden)
==================================================
Starting MongoDB connection...
MONGODB_URI is set (hiding value for security)
Attempting to connect to MongoDB Atlas...
MongoDB client connected successfully
Database and collection references created
Checking for duplicate entries...
✓ Unique index on username created
✓ Connected to MongoDB Atlas successfully
==================================================
✓ Server started successfully
✓ Listening on port [PORT]
✓ Ready to accept requests
==================================================
```

## If MONGODB_URI is NOT Set

You'll see:
```
MONGODB_URI: NOT SET - THIS WILL CAUSE FAILURE!
ERROR: MONGODB_URI environment variable is not set!
Please set MONGODB_URI in Railway environment variables.
```

## How to Set MONGODB_URI in Railway

1. Go to https://railway.app
2. Click on your project
3. Click on the backend service (the one running Node.js)
4. Click the **Variables** tab (top menu)
5. Click **+ New Variable** button
6. Enter:
   - **Variable Name**: `MONGODB_URI`
   - **Value**: `mongodb+srv://richiebramley_db_user:xZb1nn7INiQBRcqH@btd.ejdl8qt.mongodb.net/?appName=BTD`
7. Click **Add**
8. Railway will automatically redeploy

After redeployment, check the logs again - you should see the MongoDB connection messages.

