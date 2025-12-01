# Discord Integration Setup Guide

This guide will help you set up two-way communication between Discord and your Supabase task manager.

## Prerequisites

1. **Discord Bot** - Create a bot in the [Discord Developer Portal](https://discord.com/developers/applications)
2. **Discord Application ID** - Found in your Discord application's General Information
3. **Discord Bot Token** - Found in your Discord application's Bot section
4. **Discord Public Key** - Found in your Discord application's General Information → Public Key

## Step 1: Database Migration

First, add the required columns to your `tasks` table:

```sql
-- Run this migration in your Supabase SQL Editor
-- File: supabase/migrations/20250120000000_add_discord_support.sql
```

Or manually run:

```sql
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_discord_user_id 
  ON public.tasks(discord_user_id);
```

## Step 2: Deploy the Edge Function

1. **Set Environment Variables** in Supabase Dashboard:
   - Go to Project Settings → Edge Functions → Secrets
   - Add the following secrets:
     - `DISCORD_PUBLIC_KEY` = `4dd108294776df53fa67be61c1de982cbc982af9165f784b64574d89f7ff61dc`
     - `DISCORD_BOT_TOKEN` = `YOUR_DISCORD_BOT_TOKEN_HERE`
     - `SUPABASE_URL` - Your Supabase project URL (usually auto-set)
     - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

2. **Deploy the Function**:
   ```bash
   # Using Supabase CLI
   supabase functions deploy discord-interactions
   ```

   Or use the Supabase Dashboard:
   - Go to Edge Functions
   - Click "Deploy Function"
   - Upload the `supabase/functions/discord-interactions` folder

## Step 3: Configure Discord Webhook

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **General Information**
4. Copy your **Public Key** (you'll need this for `DISCORD_PUBLIC_KEY`)
5. Go to **Interactions** → **Interactions Endpoint URL**
6. Enter your Supabase Edge Function URL:
   ```
   https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions
   ```
7. Click **Save Changes**

## Step 4: Register the Slash Command

Register the `/addtask` command with Discord using one of these methods:

### Option A: Node.js Script
```bash
export DISCORD_BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
export DISCORD_APPLICATION_ID="1445078785912471734"
node scripts/register-discord-command.js
```

### Option B: Bash Script
```bash
export DISCORD_BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
export DISCORD_APPLICATION_ID="1445078785912471734"
chmod +x scripts/register-discord-command.sh
./scripts/register-discord-command.sh
```

### Option C: cURL
```bash
curl -X POST \
  "https://discord.com/api/v10/applications/1445078785912471734/commands" \
  -H "Authorization: Bot YOUR_DISCORD_BOT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "addtask",
    "description": "Add a new task to the task manager",
    "options": [
      {
        "name": "content",
        "description": "The content/description of the task",
        "type": 3,
        "required": true
      }
    ]
  }'
```

See `scripts/register-discord-command.md` for more details.

## Step 5: Invite Bot to Server

1. Go to **OAuth2** → **URL Generator** in Discord Developer Portal
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - `Send Messages`
   - `Use Slash Commands`
4. Copy the generated URL and open it in your browser
5. Select the server where you want to add the bot
6. Authorize the bot

## Step 6: Test the Integration

1. Open Discord in a server where your bot is present
2. Type `/addtask` in any channel
3. Enter task content when prompted
4. The bot should respond with: `✅ Task added: [your content]`
5. Check your Supabase `tasks` table to verify the task was created

## Troubleshooting

### Error: 401 Unauthorized
- **Cause**: Invalid Discord signature verification
- **Solution**: 
  - Verify `DISCORD_PUBLIC_KEY` is set correctly in Supabase secrets
  - Make sure the public key is the full hex string (64 characters)

### Error: Command not found
- **Cause**: Command not registered or not propagated yet
- **Solution**:
  - Wait up to 1 hour for global commands to appear
  - Restart Discord client
  - Re-run the registration script

### Error: Database insert failed
- **Cause**: Missing columns or RLS policies
- **Solution**:
  - Run the migration: `supabase/migrations/20250120000000_add_discord_support.sql`
  - Check RLS policies allow inserts from service role

### Bot doesn't respond
- **Cause**: Edge function not deployed or URL incorrect
- **Solution**:
  - Verify the function is deployed: `supabase functions list`
  - Check the Interactions Endpoint URL in Discord Developer Portal
  - Check Supabase Edge Function logs for errors

## Security Notes

1. **Signature Verification**: The function verifies all requests using Ed25519 signatures. Never disable this.
2. **Service Role Key**: The function uses the service role key to bypass RLS. Keep this secret secure.
3. **Public Key**: The Discord public key is safe to expose (it's public by design).

## Function Endpoints

- **URL**: `https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions`
- **Method**: POST
- **Headers**: 
  - `x-signature-ed25519`: Discord signature
  - `x-signature-timestamp`: Discord timestamp
  - `Content-Type`: application/json

## Next Steps

- Add more slash commands (e.g., `/listtasks`, `/completetask`)
- Set up Discord user ID to Supabase user ID mapping
- Add task notifications back to Discord
- Implement task status updates via Discord buttons

## Support

For issues or questions:
1. Check Supabase Edge Function logs
2. Check Discord Developer Portal → Interactions → Logs
3. Verify all environment variables are set correctly

