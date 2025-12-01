#!/bin/bash

# Script to register the /addtask slash command with Discord
# 
# Usage:
#   chmod +x scripts/register-discord-command.sh
#   ./scripts/register-discord-command.sh
# 
# Make sure to set these environment variables:
#   - DISCORD_BOT_TOKEN: Your Discord bot token
#   - DISCORD_APPLICATION_ID: Your Discord application ID

if [ -z "$DISCORD_BOT_TOKEN" ] || [ -z "$DISCORD_APPLICATION_ID" ]; then
  echo "❌ Error: Missing required environment variables"
  echo "   Please set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID"
  exit 1
fi

COMMAND_DATA='{
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

echo "📝 Registering /addtask command with Discord..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands" \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$COMMAND_DATA")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Command registered successfully!"
  echo "$BODY" | grep -o '"id":"[^"]*"' | head -1
  echo ""
  echo "💡 Note: It may take up to 1 hour for the command to appear in Discord."
  echo "   To update immediately, you can restart your Discord client."
else
  echo "❌ Error registering command:"
  echo "   HTTP Code: $HTTP_CODE"
  echo "   Response: $BODY"
  exit 1
fi

