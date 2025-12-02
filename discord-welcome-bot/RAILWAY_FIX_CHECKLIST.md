# Railway Variables - Quick Fix Checklist

## ✅ Step-by-Step Fix

### 1. Go to Railway Dashboard
- https://railway.app/dashboard
- Click on your project

### 2. Click on Your SERVICE
**IMPORTANT:** Not the project, but the actual **SERVICE** (the running container)
- You should see a service name (usually your repo name)
- Click on that service name

### 3. Go to Variables Tab
- Click "Variables" tab in the service view
- NOT the project variables, but SERVICE variables

### 4. Add Variables (Exact Names!)

Click "New Variable" and add these **EXACT** names:

**Variable 1:**
- Name: `DISCORD_BOT_TOKEN` (exactly this, all caps, underscore)
- Value: `YOUR_DISCORD_BOT_TOKEN_HERE`
- Click "Add"

**Variable 2:**
- Name: `SUPABASE_ANON_KEY` (exactly this, all caps, underscores)
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcmlmYmVjb29hemJldmF1ZmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTA1MDYsImV4cCI6MjA3ODA4NjUwNn0.oPCNCdABAyfY_1jkBJUhW-xSsJFcoByonpJgQ-CPCd4`
- Click "Add"

**Variable 3 (Optional):**
- Name: `WELCOME_FUNCTION_URL`
- Value: `https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome`
- Click "Add"

### 5. Verify Variables Are Listed
- You should see all 3 variables in the list
- Make sure they're at the SERVICE level, not project level

### 6. Manually Redeploy
- Go to "Deployments" tab
- Click "Redeploy" button (or three dots → Redeploy)
- Wait for deployment to complete

### 7. Check Logs
- Go to "Deployments" tab
- Click on the latest deployment
- Click "View Logs"
- You should see:
  ```
  🔍 Environment check:
     DISCORD_BOT_TOKEN: ✅ Set (MTQ0NTA3ODc4NTkxMjQ3...)
     SUPABASE_ANON_KEY: ✅ Set (eyJhbGciOiJIUzI1NiIsInR5cCI6...)
  ✅ Discord Welcome Bot is ready!
  ```

## ❌ Common Mistakes

1. **Variables at project level instead of service level**
   - Fix: Click on the SERVICE, not just the project

2. **Wrong variable names**
   - ❌ Wrong: `discord_bot_token`, `DISCORD-BOT-TOKEN`, `Discord_Bot_Token`
   - ✅ Correct: `DISCORD_BOT_TOKEN`

3. **Extra spaces**
   - Make sure no spaces before/after names or values

4. **Not redeploying after adding variables**
   - Always redeploy after adding variables

## 🔍 Debug: Check What Railway Sees

After redeploying, the logs will show:
- ✅ If variables are set: `DISCORD_BOT_TOKEN: ✅ Set (...)`
- ❌ If missing: `DISCORD_BOT_TOKEN: ❌ Missing`

This tells you exactly what Railway can see!



