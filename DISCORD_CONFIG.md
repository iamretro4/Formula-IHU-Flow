# Discord Configuration - Your Setup

## ✅ Command Registration Status

**Status**: ✅ Registered Successfully
- **Command ID**: `1445080221848961075`
- **Command Name**: `addtask`
- **Application ID**: `1445078785912471734`

The `/addtask` command has been registered with Discord. It may take up to 1 hour to appear, or restart your Discord client to see it immediately.

## Your Discord Credentials

### Application Information
- **Application ID**: `1445078785912471734`
- **Public Key**: `4dd108294776df53fa67be61c1de982cbc982af9165f784b64574d89f7ff61dc`
- **Bot Token**: `YOUR_DISCORD_BOT_TOKEN_HERE` ⚠️ **KEEP SECRET**

## Next Steps

### 1. Set Supabase Edge Function Secrets

Go to Supabase Dashboard → Edge Functions → Secrets and add:

```
DISCORD_PUBLIC_KEY=4dd108294776df53fa67be61c1de982cbc982af9165f784b64574d89f7ff61dc
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
```

(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are usually auto-set)

### 2. Configure Discord Interactions Endpoint

1. Go to [Discord Developer Portal](https://discord.com/developers/applications/1445078785912471734)
2. Navigate to **Interactions** → **Interactions Endpoint URL**
3. Enter your Supabase Edge Function URL:
   ```
   https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions
   ```
   ✅ **This is your actual function URL - copy and paste this directly!**
4. Click **Save Changes**

### 3. Deploy the Edge Function

```bash
supabase functions deploy discord-interactions
```

Or use the Supabase Dashboard to deploy.

### 4. Run Database Migration

Execute this SQL in your Supabase SQL Editor:

```sql
-- Add Discord support columns
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_discord_user_id 
  ON public.tasks(discord_user_id);
```

Or run the migration file:
```sql
-- File: supabase/migrations/20250120000000_add_discord_support.sql
```

### 5. Test the Integration

1. Open Discord in a server where your bot is present
2. Type `/addtask` in any channel
3. Enter task content when prompted
4. You should see: `✅ Task added: [your content]`
5. Check your Supabase `tasks` table to verify

## Quick Re-register Command

If you need to re-register the command:

```powershell
$env:DISCORD_BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
$env:DISCORD_APPLICATION_ID="1445078785912471734"
node scripts/register-discord-command.js
```

## Security Reminders

⚠️ **Important**: 
- Never commit your bot token to version control
- Keep the bot token secret
- The public key is safe to share (it's public by design)
- Store sensitive values in Supabase Edge Function secrets, not in code

## Troubleshooting

### Command doesn't appear in Discord
- Wait up to 1 hour for global commands to propagate
- Restart your Discord client
- Verify the bot is in your server with proper permissions

### 401 Unauthorized errors
- Check that `DISCORD_PUBLIC_KEY` is set correctly in Supabase secrets
- Verify the public key matches: `4dd108294776df53fa67be61c1de982cbc982af9165f784b64574d89f7ff61dc`

### Bot doesn't respond
- Check Supabase Edge Function logs
- Verify the Interactions Endpoint URL is set correctly
- Ensure the function is deployed and running

## Useful Links

- [Discord Developer Portal](https://discord.com/developers/applications/1445078785912471734)
- [Discord API Documentation](https://discord.com/developers/docs/interactions/overview)
- Your Supabase Dashboard

