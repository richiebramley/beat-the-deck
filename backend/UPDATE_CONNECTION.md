# Quick Reference: Update MongoDB Connection String

## Where to Update

### 1. Railway (Production)
- Dashboard → Your Project → Backend Service → Variables
- Variable name: `MONGODB_URI`
- Value: Your new connection string

### 2. Local Development (.env file)
```bash
cd backend
# Edit .env file:
MONGODB_URI=your_new_connection_string
PORT=3000
```

## Connection String Format

```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority
```

**Note:** 
- Replace `USERNAME` and `PASSWORD` with your actual credentials
- Replace `CLUSTER` with your cluster URL
- `DATABASE` can be anything (code uses `beatTheDeck` automatically)

## After Updating

1. Railway will auto-redeploy when you update the variable
2. For local: Restart the server (`npm start`)

## Test Connection

```bash
curl https://your-railway-url.up.railway.app/health
```

Should return: `{"status":"ok","timestamp":...}`

