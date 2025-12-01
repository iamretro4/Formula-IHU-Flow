# 🚀 Quick Deploy Guide - Choose Your Platform

## Option 1: Railway (Recommended - Always On)

**Best for:** 24/7 uptime, automatic deployments

1. Go to https://railway.app/
2. Sign up with GitHub
3. New Project → Deploy from GitHub
4. Select `discord-welcome-bot` folder
5. Environment variables are already in `.env` file
6. Deploy! ✅

**See `DEPLOY_RAILWAY.md` for detailed steps**

---

## Option 2: Glitch (Easiest Setup)

**Best for:** Quick testing, simple setup

1. Go to https://glitch.com/
2. Sign up with GitHub
3. New Project → Import from GitHub
4. Select `discord-welcome-bot` folder
5. Edit `.env` file with your variables (already set!)
6. Done! ✅

**Note:** Glitch apps sleep after inactivity. Use Railway for always-on.

**See `DEPLOY_GLITCH.md` for detailed steps**

---

## Option 3: Run Locally (For Testing)

```bash
cd discord-welcome-bot
npm install
npm start
```

The `.env` file is already configured!

---

## ✅ Environment Variables (Already Set!)

Your `.env` file already has:
- ✅ Discord Bot Token
- ✅ Supabase Anon Key
- ✅ Welcome Function URL

No need to configure anything!

---

## 🎯 Recommended: Railway

Railway is the best option because:
- ✅ Always on (no sleeping)
- ✅ Free tier ($5/month credit)
- ✅ Automatic deployments
- ✅ Easy to use
- ✅ Great for Discord bots

**Just deploy and forget!** 🎉

