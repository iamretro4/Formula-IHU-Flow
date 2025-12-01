# Discord Welcome Bot - Setup Instructions

## Step-by-Step Guide

### Step 1: Install Node.js

Make sure you have Node.js 18+ installed:
```bash
node --version
```

If not installed, download from: https://nodejs.org/

### Step 2: Install Dependencies

```bash
cd discord-welcome-bot
npm install
```

This will install:
- `discord.js` - Discord API library
- `dotenv` - Environment variable management

### Step 3: Get Your Supabase Anon Key

1. Go to: https://supabase.com/dashboard/project/hirifbecooazbevauffq
2. Click **Settings** (gear icon) → **API**
3. Find **Project API keys**
4. Copy the **`anon` public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
5. **Important:** Use the `anon` key, NOT the `service_role` key!

### Step 4: Configure the Bot

1. Copy the example environment file:
   ```bash
   cp env.template .env
   ```

2. Edit `.env` and set:
   ```
   DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
   SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. (Optional) Set a specific welcome channel:
   - Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
   - Right-click on your welcome channel → Copy ID
   - Add to `.env`: `WELCOME_CHANNEL_ID=your_channel_id`

### Step 5: Run the Bot

```bash
npm start
```

You should see:
```
🚀 Starting Discord Welcome Bot...
✅ Discord Welcome Bot is ready!
   Logged in as: YourBot#1234
   Watching for new members...
```

### Step 6: Test It

1. Have someone join your Discord server (or use an alt account)
2. The bot should automatically send a welcome message
3. Check the console logs to see what happened

## Running in Background

### Option 1: PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start index.js --name discord-welcome-bot

# View logs
pm2 logs discord-welcome-bot

# Auto-start on reboot
pm2 startup
pm2 save
```

### Option 2: Screen (Linux/Mac)

```bash
screen -S welcome-bot
npm start
# Press Ctrl+A then D to detach
# Reattach with: screen -r welcome-bot
```

### Option 3: Windows Task Scheduler

1. Create a batch file `start-bot.bat`:
   ```batch
   @echo off
   cd /d "C:\path\to\discord-welcome-bot"
   npm start
   ```

2. Set up Task Scheduler to run it on startup

## Deployment Options

### Railway (Free Tier Available)

1. Go to https://railway.app/
2. New Project → Deploy from GitHub
3. Select this folder
4. Add environment variables in Railway dashboard
5. Deploy!

### Glitch (Free)

1. Go to https://glitch.com/
2. New Project → Import from GitHub
3. Add environment variables in `.env` file
4. Project will auto-start!

### Heroku

1. Create `Procfile`:
   ```
   worker: node index.js
   ```

2. Deploy and set environment variables

## Troubleshooting

### "DISCORD_BOT_TOKEN is required"
- Make sure `.env` file exists
- Check the token is correct
- No quotes around the value in `.env`

### "Failed to login"
- Bot token might be invalid
- Bot might not be in your server
- Check bot has proper permissions

### "Welcome message not sending"
- Check Supabase anon key is correct
- Verify `discord-welcome` function is deployed
- Check bot can send messages in the channel
- Look at console logs for errors

### Bot keeps disconnecting
- Check your internet connection
- Verify Discord API status
- Check for rate limits
- Review error logs

## Next Steps

Once the bot is running:
1. ✅ Test with a new member joining
2. ✅ Verify welcome message appears
3. ✅ Check role selection buttons work
4. ✅ Set up auto-restart (PM2 or similar)

## Support

- Check console logs for errors
- Review Supabase function logs
- Verify all environment variables are set
- Make sure bot has proper Discord permissions

---

**Your bot is ready to welcome new members automatically! 🎉**

