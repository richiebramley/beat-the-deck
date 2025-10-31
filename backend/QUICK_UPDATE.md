# Quick Update: New MongoDB Cluster

## Your New Connection String

```
mongodb+srv://richiebramley_db_user:<db_password>@beatthedeck.uju6avl.mongodb.net/?appName=BeatTheDeck
```

## Steps to Update

### 1. Replace the Password
Replace `<db_password>` with your actual MongoDB database user password.

**Example:** If your password is `mypass123`, the connection string becomes:
```
mongodb+srv://richiebramley_db_user:mypass123@beatthedeck.uju6avl.mongodb.net/?appName=BeatTheDeck
```

### 2. Update Railway

1. Go to https://railway.app
2. Your Project → Backend Service → **Variables** tab
3. Find `MONGODB_URI` or click **"+ New Variable"**
4. Set the value to your complete connection string (with password replaced)
5. Save - Railway will automatically redeploy

### 3. Verify Connection

After redeployment, check Railway logs. You should see:
```
MONGODB_URI: SET (hidden)
Starting MongoDB connection...
✓ Connected to MongoDB Atlas successfully
```

### 4. Test API

```bash
curl https://beat-the-deck-production.up.railway.app/health
```

Should return: `{"status":"ok","timestamp":...}`

## For Local Testing (Optional)

Update `backend/.env`:
```
MONGODB_URI=mongodb+srv://richiebramley_db_user:YOUR_PASSWORD_HERE@beatthedeck.uju6avl.mongodb.net/?appName=BeatTheDeck
PORT=3000
```

## Important: Network Access

Make sure MongoDB Atlas allows Railway IPs:
1. MongoDB Atlas → Network Access
2. Add IP: `0.0.0.0/0` (allows all) or Railway's specific IPs
3. Confirm

