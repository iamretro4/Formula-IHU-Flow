# Deploy to Glitch (Free) - Alternative Option

Glitch is another free option that's super simple!

## 🚀 Quick Deploy (3 minutes)

### Step 1: Sign Up

1. Go to https://glitch.com/
2. Click **"Sign In"** → Sign up with GitHub (easiest)

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Import from GitHub"**
3. Enter your repository URL or select from list
4. Select the `discord-welcome-bot` folder

### Step 3: Set Environment Variables

1. Click on **".env"** file in the file tree
2. Add these variables:

```
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcmlmYmVjb29hemJldmF1ZmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTA1MDYsImV4cCI6MjA3ODA4NjUwNn0.oPCNCdABAyfY_1jkBJUhW-xSsJFcoByonpJgQ-CPCd4
WELCOME_FUNCTION_URL=https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome
```

### Step 4: Start the Bot

1. Glitch will automatically detect it's a Node.js project
2. Click **"Tools"** → **"Logs"** to see output
3. You should see: `✅ Discord Welcome Bot is ready!`

## ✅ Verify It's Working

1. Check the **Logs** tab
2. You should see the bot connected
3. Test by having someone join your Discord server

## 🔧 Keep It Alive

Glitch apps "sleep" after inactivity. To keep it running:

1. **Option 1:** Use a pinger service like:
   - https://uptimerobot.com/ (free)
   - Ping your Glitch app URL every 5 minutes

2. **Option 2:** Upgrade to Glitch Pro ($5/month) for always-on

3. **Option 3:** Use Railway instead (better for always-on)

## 🎉 That's It!

Your bot is now running on Glitch!

