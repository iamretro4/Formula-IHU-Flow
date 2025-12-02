# 🚂 Railway Deployment - Quick Start

## Step 1: Push to GitHub (If Not Done)

First, make sure your Discord bot is pushed to GitHub:

```bash
cd discord-welcome-bot
git remote add origin https://github.com/iamretro4/discord-welcome-bot.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway

### Option A: Deploy from GitHub (Recommended)

1. **Go to Railway**: https://railway.app/
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Authorize Railway** to access your GitHub if needed
6. **Select your repository**: `discord-welcome-bot`
7. **Railway will automatically:**
   - Detect it's a Node.js project
   - Install dependencies
   - Start the bot

### Option B: Deploy from Local Directory

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize and Deploy**:
   ```bash
   cd discord-welcome-bot
   railway init
   railway up
   ```

## Step 3: Set Environment Variables

Railway needs your environment variables:

1. **Go to your project** in Railway dashboard
2. **Click on "Variables" tab**
3. **Add these variables**:

```
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcmlmYmVjb29hemJldmF1ZmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTA1MDYsImV4cCI6MjA3ODA4NjUwNn0.oPCNCdABAyfY_1jkBJUhW-xSsJFcoByonpJgQ-CPCd4
WELCOME_FUNCTION_URL=https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome
```

**Note:** Railway will automatically restart the bot when you add variables.

## Step 4: Verify Deployment

1. **Go to "Deployments" tab**
2. **Click on the latest deployment**
3. **Check "Logs"** - you should see:
   ```
   ✅ Discord Welcome Bot is ready!
   Logged in as: YourBot#1234
   Watching for new members...
   ```

## ✅ That's It!

Your bot is now running 24/7 on Railway!

## 🔧 Troubleshooting

### Bot doesn't start
- Check logs for errors
- Verify all environment variables are set
- Make sure bot token is correct

### Bot disconnects
- Check Railway logs
- Verify environment variables
- Check Discord API status

### Need to update the bot
- Just push to GitHub
- Railway will automatically redeploy!

## 💰 Free Tier

Railway's free tier includes:
- ✅ $5 credit per month
- ✅ Perfect for small bots
- ✅ Automatic deployments
- ✅ Logs and monitoring

Your bot should stay well within the free tier!

