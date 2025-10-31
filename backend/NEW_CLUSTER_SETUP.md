# Setting Up a New MongoDB Cluster

## Step 1: Create New MongoDB Atlas Cluster

1. Go to https://cloud.mongodb.com/
2. Create a new cluster (or use an existing one)
3. Click "Connect" → "Connect your application"
4. Copy the connection string (it will look like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<username>` and `<password>` with your database credentials

## Step 2: Set Network Access

1. Go to **Network Access** in MongoDB Atlas
2. Click **"Add IP Address"**
3. Select **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
   - Or add Railway's specific IPs if you know them
4. Click **"Confirm"**

## Step 3: Create Database User

1. Go to **Database Access** in MongoDB Atlas
2. Click **"Add New Database User"**
3. Create a user with username and password
4. Set permissions to **"Read and write to any database"**
5. Note down the username and password

## Step 4: Update Connection String Format

Your connection string should be:
```
mongodb+srv://<YOUR_USERNAME>:<YOUR_PASSWORD>@<CLUSTER_URL>/<DATABASE_NAME>?retryWrites=true&w=majority
```

Example:
```
mongodb+srv://myuser:mypass123@cluster0.abc123.mongodb.net/beatTheDeck?retryWrites=true&w=majority
```

## Step 5: Update Railway Environment Variable

1. Go to https://railway.app
2. Your Project → Backend Service → **Variables** tab
3. Find `MONGODB_URI` or create it
4. Update the value with your NEW connection string
5. Railway will auto-redeploy

## Step 6: Update Local .env (Optional)

If you want to test locally:
```bash
cd backend
# Edit .env file
MONGODB_URI=your_new_connection_string_here
PORT=3000
```

## Step 7: Verify Connection

After Railway redeploys, check the logs. You should see:
```
✓ Connected to MongoDB Atlas successfully
```

## Important Notes

- The database name in the connection string doesn't matter - the code uses `beatTheDeck`
- The collection `leaderboard` will be created automatically
- Old data in the previous cluster won't transfer - you'll start fresh
- Make sure the connection string is properly URL-encoded (especially if password has special characters)

