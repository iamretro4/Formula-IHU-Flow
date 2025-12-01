# Automatic Welcome Messages Setup

## Overview

To enable automatic welcome messages when users join your Discord server, you need to connect to Discord's Gateway API. Since Supabase Edge Functions are stateless, we'll use a webhook-based approach.

## Option 1: Use Discord Webhooks (Recommended - Easiest)

Discord doesn't natively send webhooks for member join events, but you can use a third-party service or bot.

### Using a Gateway Bot Service

1. **Deploy the gateway handler function:**
   ```bash
   supabase functions deploy discord-gateway
   ```

2. **Set up a Discord Gateway bot** (using a service like [Discord.js](https://discord.js.org/) or similar):
   - The bot connects to Discord Gateway
   - Listens for `GUILD_MEMBER_ADD` events
   - Calls your `discord-gateway` function when a member joins

3. **Or use a service like:**
   - [Autocode](https://autocode.com/) - Free tier available
   - [Glitch](https://glitch.com/) - Free hosting
   - [Railway](https://railway.app/) - Free tier available

## Option 2: Manual Webhook Setup (Simpler)

Since automatic Gateway connection is complex, you can:

1. **Set up a webhook in Discord** for a specific channel
2. **Use a bot service** that monitors member joins and calls your function

### Quick Setup with External Service

1. **Create a simple Node.js bot** (can run on Glitch/Railway for free):

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

client.on('guildMemberAdd', async (member) => {
  // Call your Supabase function
  await fetch('https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'guild_member_add',
      guild_id: member.guild.id,
      user: {
        id: member.user.id,
        username: member.user.username,
      },
      channel_id: member.guild.systemChannelId, // or specify a channel
    }),
  });
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

2. **Deploy this bot** to a free hosting service
3. **Set environment variables:**
   - `DISCORD_BOT_TOKEN` - Your bot token
   - `SUPABASE_ANON_KEY` - Your Supabase anon key

## Option 3: Use Discord's Built-in Welcome Messages (Simplest)

Discord has built-in welcome messages! You can:

1. Go to **Server Settings** → **Onboarding**
2. Enable **Welcome Messages**
3. Configure the welcome channel
4. Customize the message

However, this won't integrate with your Supabase app or role selection.

## Recommended: Hybrid Approach

1. **Use Discord's built-in welcome** for basic messages
2. **Use your bot for role selection** via `/setupwelcome` command
3. **Link accounts** via `/linkaccount` command

## Current Setup

Your current setup:
- ✅ Welcome message function ready
- ✅ Role selection system ready
- ✅ Account linking ready
- ⚠️ Automatic triggers need external service

## Quick Test

You can manually test the welcome function:

```bash
curl -X POST https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "guild_member_add",
    "guild_id": "YOUR_GUILD_ID",
    "user": {
      "id": "USER_ID",
      "username": "testuser"
    },
    "channel_id": "WELCOME_CHANNEL_ID"
  }'
```

## Next Steps

1. **For now**: Use `/setupwelcome` command to set up role selection
2. **Later**: Set up a Gateway bot service for automatic welcome messages
3. **Alternative**: Use Discord's built-in welcome + your role selection system

The role selection and account linking will work regardless of the welcome message method!

