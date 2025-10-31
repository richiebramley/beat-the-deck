# Production Database Connection Troubleshooting

## Issue: Backend not connecting to MongoDB in production

### Step 1: Verify Railway Deployment

1. Go to https://railway.app
2. Open your project
3. Check if the backend service is deployed and running (green status)
4. Check the **Logs** tab for errors

### Step 2: Verify Environment Variables

In Railway dashboard:
1. Go to your backend service
2. Click **Variables** tab
3. Verify `MONGODB_URI` is set:
   ```
   mongodb+srv://richiebramley_db_user:xZb1nn7INiQBRcqH@btd.ejdl8qt.mongodb.net/?appName=BTD
   ```

If missing, click **+ New Variable** and add it.

### Step 3: Check MongoDB Atlas Network Access

1. Go to https://cloud.mongodb.com/
2. Click **Network Access**
3. Ensure Railway IPs are allowed:
   - Add IP Address: `0.0.0.0/0` (allows all IPs)
   - Or add specific Railway IP ranges

### Step 4: Verify Railway Logs

Look for these messages in Railway logs:
```
Connected to MongoDB Atlas
Unique index on username created
Leaderboard API running on port [PORT]
```

If you see errors like:
- `Failed to connect to MongoDB` → Check MONGODB_URI and network access
- `Unauthorized` → Check MongoDB credentials
- `ECONNREFUSED` → Network access issue

### Step 5: Test API Endpoint

Once deployed, test your Railway URL:
```bash
curl https://beat-the-deck-production.up.railway.app/health
```

Should return: `{"status":"ok","timestamp":...}`

### Step 6: Common Issues

**Issue: Service shows as "Stopped"**
- Check if build succeeded
- Check if MONGODB_URI is set
- Check logs for startup errors

**Issue: 404 Not Found**
- Verify the service is actually deployed
- Check if root directory is set to `backend` in Railway settings
- Verify the service is running (not crashed)

**Issue: Connection Timeout**
- MongoDB Atlas might be blocking Railway IPs
- Add `0.0.0.0/0` to Network Access in MongoDB Atlas

### Step 7: Redeploy

If variables are set but not working:
1. Go to Railway dashboard
2. Click on your service
3. Go to **Settings** → **Deployments**
4. Click **Redeploy** or trigger a new deployment

