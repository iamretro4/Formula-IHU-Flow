# Deploy to Railway (Free) - Step by Step

Railway offers a free tier that's perfect for running the Discord welcome bot!

## 🚀 Quick Deploy (5 minutes)

### Step 1: Sign Up for Railway

1. Go to https://railway.app/
2. Click **"Start a New Project"**
3. Sign up with GitHub (recommended) or email

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account if needed
4. Select your repository
5. Select the `discord-welcome-bot` folder

### Step 3: Set Environment Variables

Railway will automatically detect the `.env` file, but you should also set them in Railway for security:

1. Click on your project
2. Go to **Variables** tab
3. Add these variables:

```
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcmlmYmVjb29hemJldmF1ZmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTA1MDYsImV4cCI6MjA3ODA4NjUwNn0.oPCNCdABAyfY_1jkBJUhW-xSsJFcoByonpJgQ-CPCd4
WELCOME_FUNCTION_URL=https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome
```

### Step 4: Deploy!

1. Railway will automatically:
   - Detect it's a Node.js project
   - Install dependencies (`npm install`)
   - Start the bot (`npm start`)

2. Check the **Deployments** tab to see logs
3. You should see: `✅ Discord Welcome Bot is ready!`

## ✅ Verify It's Working

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Check **Logs** - you should see:
   ```
   ✅ Discord Welcome Bot is ready!
   Logged in as: YourBot#1234
   Watching for new members...
   ```

4. Test by having someone join your Discord server
5. Check logs to see the welcome message being sent

## 🔧 Troubleshooting

### Bot doesn't start
- Check logs for errors
- Verify environment variables are set correctly
- Make sure bot token is valid

### Bot disconnects
- Check Railway logs
- Verify internet connection
- Check Discord API status

### Welcome messages not sending
- Check Supabase anon key is correct
- Verify `discord-welcome` function is deployed
- Check Railway logs for errors

## 💰 Free Tier Limits

Railway's free tier includes:
- ✅ $5 credit per month (plenty for a small bot)
- ✅ Automatic deployments
- ✅ Logs and monitoring
- ✅ Environment variables

The bot uses minimal resources, so you should stay well within the free tier!

## 🔄 Auto-Deploy

Railway automatically redeploys when you push to GitHub:
1. Make changes to the code
2. Push to GitHub
3. Railway automatically redeploys!

## 📊 Monitoring

- View logs in Railway dashboard
- Check deployment status
- Monitor resource usage
- Set up alerts if needed

## 🎉 That's It!

Your bot is now running 24/7 on Railway for free!

---

**Alternative: Deploy to Glitch (Also Free)**

If Railway doesn't work, try Glitch:
1. Go to https://glitch.com/
2. New Project → Import from GitHub
3. Select your repo and `discord-welcome-bot` folder
4. Glitch will auto-detect and run it!

