# Register Discord Slash Command

This guide shows you how to register the `/addtask` command with Discord.

## Prerequisites

- Discord Bot Token (`DISCORD_BOT_TOKEN`)
- Discord Application ID (`DISCORD_APPLICATION_ID`)

You can find these in the [Discord Developer Portal](https://discord.com/developers/applications).

## Method 1: Using Node.js Script

```bash
# Set environment variables
export DISCORD_BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
export DISCORD_APPLICATION_ID="1445078785912471734"

# Run the script
node scripts/register-discord-command.js
```

## Method 2: Using Bash Script

```bash
# Set environment variables
export DISCORD_BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
export DISCORD_APPLICATION_ID="1445078785912471734"

# Make script executable
chmod +x scripts/register-discord-command.sh

# Run the script
./scripts/register-discord-command.sh
```

## Method 3: Using cURL (Direct)

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

## Method 4: Using PowerShell (Windows)

```powershell
$env:DISCORD_BOT_TOKEN = "YOUR_DISCORD_BOT_TOKEN_HERE"
$env:DISCORD_APPLICATION_ID = "1445078785912471734"

$headers = @{
    "Authorization" = "Bot $env:DISCORD_BOT_TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    name = "addtask"
    description = "Add a new task to the task manager"
    options = @(
        @{
            name = "content"
            description = "The content/description of the task"
            type = 3
            required = $true
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "https://discord.com/api/v10/applications/$env:DISCORD_APPLICATION_ID/commands" -Method Post -Headers $headers -Body $body

Write-Host "✅ Command registered successfully!"
Write-Host "Command ID: $($response.id)"
```

## Verification

After registering, the command should appear in Discord within 1 hour (or immediately after restarting Discord).

To verify:
1. Open Discord
2. Type `/` in any channel where your bot has permissions
3. You should see `/addtask` in the command list

## Updating the Command

To update the command, simply run the registration script again. Discord will update the existing command.

## Deleting the Command

To delete the command, you need to know its command ID:

```bash
# List all commands
curl -X GET \
  "https://discord.com/api/v10/applications/1445078785912471734/commands" \
  -H "Authorization: Bot YOUR_DISCORD_BOT_TOKEN_HERE"

# Delete a specific command (replace COMMAND_ID)
curl -X DELETE \
  "https://discord.com/api/v10/applications/1445078785912471734/commands/COMMAND_ID" \
  -H "Authorization: Bot YOUR_DISCORD_BOT_TOKEN_HERE"
```

## Troubleshooting

### Error: 401 Unauthorized
- Check that your `DISCORD_BOT_TOKEN` is correct
- Make sure you're using the Bot token, not the Client Secret

### Error: 404 Not Found
- Verify your `DISCORD_APPLICATION_ID` is correct
- Make sure the bot is added to your Discord application

### Command doesn't appear in Discord
- Wait up to 1 hour for global commands to propagate
- Restart your Discord client
- Make sure the bot has the necessary permissions in the server/channel

