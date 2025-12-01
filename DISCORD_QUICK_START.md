# Discord Integration - Quick Start

## Quick Setup Checklist

- [ ] Run database migration to add `content` and `discord_user_id` columns
- [ ] Set environment variables in Supabase (DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN, etc.)
- [ ] Deploy the `discord-interactions` edge function
- [ ] Configure Discord Interactions Endpoint URL
- [ ] Register the `/addtask` slash command
- [ ] Invite bot to your Discord server
- [ ] Test with `/addtask` command

## Environment Variables Needed

Set these in Supabase Dashboard → Edge Functions → Secrets:

```
DISCORD_PUBLIC_KEY=4dd108294776df53fa67be61c1de982cbc982af9165f784b64574d89f7ff61dc
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
SUPABASE_URL=your-supabase-url (usually auto-set)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Discord URLs

- **Interactions Endpoint**: `https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions`
- **Command Registration**: `https://discord.com/api/v10/applications/1445078785912471734/commands`

## Quick Command Registration

```bash
# Set variables
export DISCORD_BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
export DISCORD_APPLICATION_ID="1445078785912471734"

# Register
node scripts/register-discord-command.js
```

## Testing

1. Open Discord
2. Type `/addtask content:Test task`
3. Bot should respond: `✅ Task added: Test task`
4. Check Supabase `tasks` table

## Files Created

- `supabase/functions/discord-interactions/index.ts` - Main edge function
- `supabase/migrations/20250120000000_add_discord_support.sql` - Database migration
- `scripts/register-discord-command.js` - Node.js registration script
- `scripts/register-discord-command.sh` - Bash registration script
- `scripts/register-discord-command.md` - Registration guide
- `DISCORD_SETUP.md` - Full setup guide

For detailed instructions, see `DISCORD_SETUP.md`.

