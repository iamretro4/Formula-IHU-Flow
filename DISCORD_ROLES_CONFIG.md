# Discord Roles Configuration

## Your Formula IHU 2026 Roles

The following roles have been configured in the system:

| Role ID | Role Name | Custom ID | Emoji |
|---------|-----------|-----------|-------|
| 1443303554503676067 | Board | role_board | 👑 |
| 1443303903226761337 | Technical | role_technical | ⚙️ |
| 1443304060886188204 | Electrical | role_electrical | ⚡ |
| 1443304154536607805 | Business | role_business | 💼 |
| 1443304364818169866 | SES | role_ses | 📊 |
| 1443304498637574335 | IAD | role_iad | 🎯 |
| 1443304529188880598 | ASES | role_ases | 🚀 |
| 1443304586176630794 | Cost Event | role_cost_event | 💰 |
| 1443304758667640903 | Design Event | role_design_event | ✏️ |
| 1443304815441608734 | BPP | role_bpp | 📋 |

## Environment Variables (Optional)

You can override these role IDs in Supabase Dashboard → Edge Functions → Secrets:

```
DISCORD_ROLE_BOARD=1443303554503676067
DISCORD_ROLE_TECHNICAL=1443303903226761337
DISCORD_ROLE_ELECTRICAL=1443304060886188204
DISCORD_ROLE_BUSINESS=1443304154536607805
DISCORD_ROLE_SES=1443304364818169866
DISCORD_ROLE_IAD=1443304498637574335
DISCORD_ROLE_ASES=1443304529188880598
DISCORD_ROLE_COST_EVENT=1443304586176630794
DISCORD_ROLE_DESIGN_EVENT=1443304758667640903
DISCORD_ROLE_BPP=1443304815441608734
```

**Note:** The role IDs are already hardcoded as defaults, so you don't need to set these unless you want to change them.

## Bot Permissions Required

Make sure your bot has these permissions:
- ✅ **Manage Roles** - To assign roles to users
- ✅ **Send Messages** - To send welcome messages
- ✅ **View Channels** - To access channels
- ✅ **Read Message History** - To read messages

## Bot Role Position

**Important:** Your bot's role must be **above** all the roles it needs to assign in the Discord server role hierarchy.

To check:
1. Go to Server Settings → Roles
2. Make sure your bot's role is higher than all team roles
3. Drag it up if needed

## Testing

1. Run `/setupwelcome channel:#roles` in Discord
2. You should see 10 role buttons (split into 2 rows of 5)
3. Click a button to assign yourself a role
4. Verify the role is assigned in Discord

## Troubleshooting

### Buttons don't assign roles
- Check bot has "Manage Roles" permission
- Verify bot's role is above the target roles
- Check role IDs are correct

### Buttons don't appear
- Verify `/setupwelcome` command ran successfully
- Check the channel has message permissions
- Look for errors in Supabase function logs

### Role not assigned
- Check Supabase function logs
- Verify the role ID matches your Discord server
- Ensure the role exists in your server

