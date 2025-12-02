# Railway Troubleshooting Guide

## ❌ Bot says "DISCORD_BOT_TOKEN is required" even after setting variables

### Common Issues:

#### 1. Variables Set at Wrong Level
**Problem:** Variables might be set at the project level instead of the service level.

**Solution:**
1. In Railway Dashboard, click on your **SERVICE** (the actual running service, not just the project)
2. Go to **Variables** tab
3. Make sure variables are listed there
4. If not, add them at the SERVICE level

#### 2. Variable Name Typos
**Problem:** Variable names must match exactly (case-sensitive).

**Solution:**
- ✅ Correct: `DISCORD_BOT_TOKEN`
- ❌ Wrong: `discord_bot_token`, `DISCORD-BOT-TOKEN`, `Discord_Bot_Token`

Double-check the exact names:
- `DISCORD_BOT_TOKEN` (all caps, underscores)
- `SUPABASE_ANON_KEY` (all caps, underscores)
- `WELCOME_FUNCTION_URL` (optional)

#### 3. Extra Spaces
**Problem:** Leading or trailing spaces in variable names or values.

**Solution:**
- Copy variable names exactly
- Don't add spaces before or after
- Check the value doesn't have extra spaces

#### 4. Railway Not Restarting
**Problem:** Railway might not have restarted after adding variables.

**Solution:**
1. Go to **Deployments** tab
2. Click **Redeploy** or **Deploy** button
3. Or trigger a new deployment by making a small change

#### 5. Variables Not Saved
**Problem:** Variables might not have been saved properly.

**Solution:**
1. Go to Variables tab
2. Verify variables are listed
3. Click on each variable to edit and re-save
4. Make sure you click "Save" or "Add Variable"

## 🔍 How to Verify Variables Are Set

### Option 1: Check Railway Logs
After the latest deployment, check logs. You should see:
```
🔍 Environment check:
   DISCORD_BOT_TOKEN: ✅ Set (MTQ0NTA3ODc4NTkxMjQ3...)
   SUPABASE_ANON_KEY: ✅ Set (eyJhbGciOiJIUzI1NiIsInR5cCI6...)
```

### Option 2: Use Test Script
Add this to your `package.json` scripts:
```json
"test-env": "node test-env.js"
```

Then in Railway, you can run it to check variables.

## 📋 Step-by-Step Fix

1. **Go to Railway Dashboard**
   - https://railway.app/dashboard

2. **Click on your project**

3. **Click on your SERVICE** (the running service, usually named after your repo)

4. **Go to Variables tab**

5. **Verify these exact variables exist:**
   ```
   DISCORD_BOT_TOKEN
   SUPABASE_ANON_KEY
   WELCOME_FUNCTION_URL (optional)
   ```

6. **If missing, click "New Variable" and add:**
   - Name: `DISCORD_BOT_TOKEN`
   - Value: `YOUR_DISCORD_BOT_TOKEN_HERE`
   - Click "Add"

   - Name: `SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcmlmYmVjb29hemJldmF1ZmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTA1MDYsImV4cCI6MjA3ODA4NjUwNn0.oPCNCdABAyfY_1jkBJUhW-xSsJFcoByonpJgQ-CPCd4`
   - Click "Add"

7. **Manually Redeploy:**
   - Go to **Deployments** tab
   - Click **Redeploy** or the three dots → **Redeploy**

8. **Check Logs:**
   - After redeploy, check logs
   - Should see environment variables are set

## 🆘 Still Not Working?

### Check These:

1. **Service vs Project Level:**
   - Variables must be at SERVICE level, not project level
   - Click on the actual service name in Railway

2. **Variable Scope:**
   - Make sure variables are not set as "Secret" if that's causing issues
   - Try setting them as regular variables first

3. **Railway Region:**
   - Some regions might have delays
   - Try redeploying

4. **Contact Railway Support:**
   - If nothing works, check Railway status
   - Or contact Railway support with your service logs

## ❌ Bot says "Used disallowed intents"

### Problem:
The bot requires the `GuildMembers` privileged intent to listen for new member join events. This intent must be enabled in the Discord Developer Portal.

### Solution:

1. **Go to Discord Developer Portal:**
   - Visit: https://discord.com/developers/applications
   - Select your bot application

2. **Enable Privileged Gateway Intents:**
   - Click on **Bot** in the left sidebar
   - Scroll down to **Privileged Gateway Intents**
   - Enable **SERVER MEMBERS INTENT** (GuildMembers)
   - Click **Save Changes**

3. **Important Notes:**
   - The bot only needs `GuildMembers` intent (for `guildMemberAdd` events)
   - You don't need `Message Content Intent` for this bot
   - After enabling, wait a few minutes for changes to propagate
   - Redeploy your bot on Railway after enabling the intent

4. **Verify:**
   - After enabling and redeploying, check logs
   - You should see: `✅ Discord Welcome Bot is ready!`
   - The error should be gone

### Why This Happens:
Discord requires bots to explicitly request privileged intents in the Developer Portal for security reasons. The `GuildMembers` intent is needed to detect when new members join your server.

## ✅ Success Indicators

When working correctly, logs should show:
```
🔍 Environment check:
   DISCORD_BOT_TOKEN: ✅ Set (MTQ0NTA3ODc4NTkxMjQ3...)
   SUPABASE_ANON_KEY: ✅ Set (eyJhbGciOiJIUzI1NiIsInR5cCI6...)
   WELCOME_FUNCTION_URL: Using default

🚀 Starting Discord Welcome Bot...
✅ Discord Welcome Bot is ready!
   Logged in as: YourBot#1234
   Watching for new members...
```



