# MongoDB Atlas Setup Guide

This guide will help you set up a fresh MongoDB Atlas database for the Beat the Deck leaderboard.

## Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account (or log in if you already have one)
3. Create a new organization and project (or use existing)

## Step 2: Create a Free Cluster

1. Click "Build a Database"
2. Choose the **FREE (M0)** tier
3. Select a cloud provider and region (choose one close to your Railway deployment)
4. Give your cluster a name (e.g., "beat-the-deck-cluster")
5. Click "Create"

## Step 3: Create a Database User

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter a username (e.g., `beatthedeck_user`)
5. Enter a strong password (save this - you'll need it!)
6. Under "Database User Privileges", select "Atlas admin" (or "Read and write to any database")
7. Click "Add User"

## Step 4: Configure Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For Railway deployment, click "Allow Access from Anywhere" (adds `0.0.0.0/0`)
   - **Note:** For production, you may want to restrict this to Railway's IP ranges
4. Click "Confirm"

## Step 5: Get Your Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Choose "Node.js" as the driver
5. Copy the connection string (looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
6. **Important:** Replace `<username>` with your database username and `<password>` with your database password

**Example connection string:**
```
mongodb+srv://beatthedeck_user:YourPassword123@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## Step 6: Set Up Local Development (Optional)

Create a `.env` file in the `backend` directory:

```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
PORT=3000
```

**Important:** Never commit the `.env` file to git! It's already in `.gitignore`.

## Step 7: Set Up Railway Production

### Using Railway Dashboard:
1. Go to your Railway project: https://railway.app
2. Select your backend service
3. Go to the "Variables" tab
4. Click "New Variable"
5. Name: `MONGODB_URI`
6. Value: Your complete connection string from Step 5
7. Click "Add"

### Using Railway CLI:
```bash
cd backend
railway variables set MONGODB_URI="mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
```

## Step 8: Verify Connection

After setting up, test the connection:

**Local:**
```bash
cd backend
npm start
```

You should see: "Connected to MongoDB Atlas"

**Railway:**
1. Check Railway logs: `railway logs`
2. Look for: "Connected to MongoDB Atlas"
3. Test health endpoint: `curl https://your-railway-url.up.railway.app/health`

## Troubleshooting

### Connection Timeout
- Check MongoDB Atlas Network Access allows `0.0.0.0/0` (or Railway IPs)
- Verify your username and password are correct
- Make sure you replaced `<username>` and `<password>` in the connection string

### Authentication Failed
- Double-check your database username and password
- Make sure the user has proper permissions (Atlas admin or read/write)

### Service Unavailable (503)
- The server starts even if MongoDB isn't connected
- Check Railway logs for MongoDB connection errors
- The service will retry connecting every 10 seconds

## Security Best Practices

1. **Never commit credentials to git** - Use environment variables
2. **Use strong passwords** - Generate a random password for your database user
3. **Restrict network access** - In production, consider restricting to specific IP ranges
4. **Rotate credentials** - Change passwords periodically
5. **Use separate databases** - Use different databases for development and production

