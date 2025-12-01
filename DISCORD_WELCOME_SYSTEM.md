# Discord Welcome System & Role Selection

## 🎉 Features Implemented

### 1. **Welcome Messages**
- Automatic welcome messages when users join the server
- Instructions for nickname change and role selection
- Link to register at flow.fihu.gr

### 2. **Role Selection System**
- Interactive buttons for team role selection
- Automatic role assignment in Discord
- Role tracking in Supabase profiles

### 3. **Dashboard Discord Widget**
- View Discord channels directly from the dashboard
- Quick access to Discord server
- Channel status and unread counts

## 📋 Setup Instructions

### Step 1: Deploy Edge Functions

```bash
# Deploy the welcome function
supabase functions deploy discord-welcome

# Deploy the updated interactions function
supabase functions deploy discord-interactions
```

### Step 2: Set Environment Variables

In Supabase Dashboard → Edge Functions → Secrets, add:

```
DISCORD_ROLE_TEAM_A=<your_team_a_role_id>
DISCORD_ROLE_TEAM_B=<your_team_b_role_id>
DISCORD_ROLE_TEAM_C=<your_team_c_role_id>
DISCORD_ROLE_TEAM_D=<your_team_d_role_id>
```

**How to get role IDs:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click on a role → Copy ID
3. Use that ID in the environment variables

### Step 3: Run Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- Add discord_role column
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS discord_role TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_discord_role 
  ON public.profiles(discord_role);
```

Or use the updated `APPLY_ALL_DISCORD_MIGRATIONS.sql` file.

### Step 4: Register New Commands

```bash
# Set environment variables
$env:DISCORD_BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
$env:DISCORD_APPLICATION_ID="1445078785912471734"

# Register all commands (including /setupwelcome)
node scripts/register-all-discord-commands.js
```

### Step 5: Set Up Welcome System

1. **Create a #roles channel** in your Discord server
2. **Run the setup command** in that channel:
   ```
   /setupwelcome channel:#roles
   ```
3. The bot will post a message with role selection buttons

### Step 6: Configure Welcome Messages (Optional)

To automatically send welcome messages when users join:

1. Set up a webhook or bot event listener (requires Discord Gateway connection)
2. Or manually trigger welcome messages using the `discord-welcome` function

## 🎮 Usage

### For Users

1. **Join the server** → Receive welcome message
2. **Change nickname** to full name (Name + Surname)
3. **Go to #roles channel** → Click a team role button
4. **Register at flow.fihu.gr** → Link account with `/linkaccount`

### For Admins

- Use `/setupwelcome channel:#roles` to set up role selection
- Configure role IDs in Supabase secrets
- Monitor role assignments in the dashboard

## 📊 Dashboard Widget

The Discord Channels widget shows:
- Server channels with icons
- Channel descriptions
- Unread message counts
- Quick link to open Discord

The widget is automatically added to the default dashboard layout.

## 🔧 Customization

### Customize Welcome Message

Edit `supabase/functions/discord-welcome/index.ts`:
- Modify the `welcomeContent` variable
- Change emojis and formatting
- Add custom instructions

### Customize Role Selection

Edit `supabase/functions/discord-interactions/index.ts`:
- Modify the `roles` array in `handleSetupWelcome`
- Add more teams or change button styles
- Update role mapping in `handleButtonInteraction`

### Customize Dashboard Widget

Edit `src/components/DashboardWidgets.tsx`:
- Modify the `channels` array in `DiscordChannelsWidget`
- Add/remove channels
- Change icons and descriptions

## 🐛 Troubleshooting

### Role buttons don't work
- Check that role IDs are set correctly in Supabase secrets
- Verify the bot has "Manage Roles" permission
- Ensure the bot's role is above the roles it's assigning

### Welcome messages not sending
- Verify the `discord-welcome` function is deployed
- Check function logs in Supabase Dashboard
- Ensure bot has permission to send messages

### Dashboard widget not showing
- Clear browser cache
- Check browser console for errors
- Verify the widget is in your default widgets list

## 📚 Related Files

- `supabase/functions/discord-welcome/index.ts` - Welcome message handler
- `supabase/functions/discord-interactions/index.ts` - Role selection handler
- `src/components/DashboardWidgets.tsx` - Discord channels widget
- `scripts/register-all-discord-commands.js` - Command registration
- `supabase/migrations/20250122000000_add_discord_role.sql` - Database migration

## ✅ Checklist

- [ ] Deploy `discord-welcome` function
- [ ] Deploy `discord-interactions` function
- [ ] Set role IDs in Supabase secrets
- [ ] Run database migration
- [ ] Register `/setupwelcome` command
- [ ] Create #roles channel
- [ ] Run `/setupwelcome channel:#roles`
- [ ] Test role selection buttons
- [ ] Verify dashboard widget appears
- [ ] Test welcome message flow

