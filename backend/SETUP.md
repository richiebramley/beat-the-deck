# Quick Setup Guide

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Get Your MongoDB Connection String

1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
2. Click on your cluster
3. Click "Connect" button
4. Select "Connect your application"
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`)
6. **Important**: Replace `<password>` with your database user's password and `<username>` with your database username

## Step 3: Create .env File

Create a file named `.env` in the `backend` directory with:

```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster.mongodb.net/?retryWrites=true&w=majority
PORT=3000
```

**Example:**
```env
MONGODB_URI=mongodb+srv://myuser:mypassword123@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
PORT=3000
```

## Step 4: Run the Server

### For Development (with auto-reload):
```bash
npm run dev
```

### For Production:
```bash
npm start
```

## Step 5: Test the Connection

Once the server is running, you should see:
```
Connected to MongoDB Atlas
Leaderboard API running on port 3000
```

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

## Step 6: Update Frontend API URL

Once you have the backend running (locally or deployed), update `API_BASE_URL` in `script.js`:

```javascript
// For local development:
const API_BASE_URL = 'http://localhost:3000';

// For Railway deployment:
const API_BASE_URL = 'https://your-railway-url.up.railway.app';
```

## Troubleshooting

### Connection Error?
- Make sure your MongoDB Atlas cluster allows connections from your IP address (Network Access in Atlas)
- Verify your username and password in the connection string
- Check that your database user has read/write permissions

### Port Already in Use?
- Change `PORT` in `.env` to a different port (e.g., `3001`)
- Or stop the process using port 3000

## Next Steps: Deploy to Railway

See `README.md` for Railway deployment instructions.

