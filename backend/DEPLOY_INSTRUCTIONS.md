# Railway Deployment Instructions

## Quick Deploy Steps

### 1. Login to Railway
```bash
cd backend
railway login
```
This will open your browser for authentication.

### 2. Initialize Project
```bash
railway init
```
When prompted:
- Create a new project
- Name it: `beat-the-deck-api` (or any name you prefer)

### 3. Set MongoDB Environment Variable
```bash
railway variables set MONGODB_URI="mongodb+srv://richiebramley_db_user:xZb1nn7INiQBRcqH@btd.ejdl8qt.mongodb.net/?appName=BTD"
```

### 4. Deploy
```bash
railway up
```

### 5. Get Your Deployment URL
```bash
railway domain
```
Or check the Railway dashboard at https://railway.app

### 6. Update Frontend
Once you have your Railway URL (e.g., `https://beat-the-deck-api.up.railway.app`), update `script.js`:
```javascript
const API_BASE_URL = 'https://your-railway-url.up.railway.app';
```

## Alternative: Use Railway Dashboard

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo" or "Empty Project"
4. If empty project:
   - Add service → "GitHub Repo" → Select your repo → Set root directory to `backend`
   - Or upload files manually
5. Go to Variables tab → Add `MONGODB_URI` with your connection string
6. Deploy → Get your URL from the Settings → Domains section

## Troubleshooting

- If deployment fails, check the logs: `railway logs`
- Make sure PORT environment variable is set (Railway sets this automatically)
- Verify MongoDB URI is correct in Railway variables

