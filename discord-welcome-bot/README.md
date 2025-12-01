# Discord Welcome Bot for Formula IHU

Automatic welcome messages for Formula IHU Discord server. This bot listens for new members joining and automatically sends welcome messages via Supabase Edge Function.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

1. Copy `env.template` to `.env`:
   ```bash
   cp env.template .env
   ```

2. Edit `.env` and fill in:
   - `DISCORD_BOT_TOKEN` - Your Discord bot token
   - `SUPABASE_ANON_KEY` - Your Supabase anon key (get from Supabase Dashboard → Settings → API)
   - `WELCOME_CHANNEL_ID` (optional) - Specific channel ID, or leave empty to use system channel

### 3. Run the Bot

```bash
npm start
```

## 📦 Deploy

### Railway (Recommended - Always On)

1. Go to https://railway.app/
2. Sign up with GitHub
3. New Project → Deploy from GitHub repo
4. Select this repository
5. Railway will auto-detect and deploy!

**See `DEPLOY_RAILWAY.md` for detailed steps**

### Glitch (Alternative)

1. Go to https://glitch.com/
2. New Project → Import from GitHub
3. Select this repository
4. Done!

**See `DEPLOY_GLITCH.md` for detailed steps**

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | ✅ Yes | Your Discord bot token |
| `SUPABASE_ANON_KEY` | ✅ Yes | Supabase anon key for API access |
| `WELCOME_FUNCTION_URL` | ❌ No | Default: `https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome` |
| `WELCOME_CHANNEL_ID` | ❌ No | Specific channel ID, or auto-detect system channel |

## 📚 Documentation

- `DEPLOY_RAILWAY.md` - Railway deployment guide
- `DEPLOY_GLITCH.md` - Glitch deployment guide
- `DEPLOY_QUICK.md` - Quick deployment reference
- `SETUP_INSTRUCTIONS.md` - Detailed setup instructions

## 🔒 Security

⚠️ **Never commit your `.env` file!** It contains sensitive credentials.

The `.env` file is already in `.gitignore` and will not be committed.

## 🎉 Features

- ✅ Automatic welcome messages when members join
- ✅ Integrates with Supabase Edge Functions
- ✅ Role selection support
- ✅ Error handling and logging
- ✅ Auto-detects welcome channel

## 📊 Monitoring

The bot logs:
- ✅ When it connects successfully
- 👋 When a new member joins
- 📤 When sending welcome messages
- ❌ Any errors that occur

## 🐛 Troubleshooting

### Bot doesn't connect
- Check `DISCORD_BOT_TOKEN` is correct
- Verify bot is invited to your server
- Check bot has necessary permissions

### Welcome messages not sending
- Check `SUPABASE_ANON_KEY` is correct
- Verify `discord-welcome` function is deployed
- Check bot has permission to send messages in the channel

## 📝 License

MIT

---

**Formula IHU 2026** - Discord Integration
