/**
 * Script to register all Discord slash commands
 * 
 * Usage:
 *   node scripts/register-all-discord-commands.js
 * 
 * Make sure to set these environment variables:
 *   - DISCORD_BOT_TOKEN: Your Discord bot token
 *   - DISCORD_APPLICATION_ID: Your Discord application ID
 */

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;

if (!DISCORD_BOT_TOKEN || !DISCORD_APPLICATION_ID) {
  console.error("❌ Error: Missing required environment variables");
  console.error("   Please set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID");
  process.exit(1);
}

const commands = [
  {
    name: "addtask",
    description: "Add a new task to the task manager",
    options: [
      {
        name: "content",
        description: "The content/description of the task",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "listtasks",
    description: "List your tasks (tasks you created)",
  },
  {
    name: "mytasks",
    description: "Show tasks assigned to you",
  },
  {
    name: "completetask",
    description: "Mark a task as complete",
    options: [
      {
        name: "id",
        description: "The ID of the task to complete (use /listtasks to see IDs)",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "linkaccount",
    description: "Link your Discord account to the app",
    options: [
      {
        name: "code",
        description: "Linking code from the app (Settings → Discord Integration)",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "setupwelcome",
    description: "Set up the welcome message with role selection (admin only)",
    options: [
      {
        name: "channel",
        description: "The channel to send the role selection message to (e.g., #roles)",
        type: 7, // CHANNEL
        required: true,
      },
    ],
  },
];

async function registerCommands() {
  console.log("📝 Registering Discord slash commands...");
  console.log(`   Application ID: ${DISCORD_APPLICATION_ID}`);
  console.log(`   Commands to register: ${commands.length}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const command of commands) {
    try {
      console.log(`   Registering /${command.name}...`);

      const response = await fetch(
        `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(command),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      console.log(`   ✅ /${command.name} registered (ID: ${data.id})`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed to register /${command.name}:`, error.message);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Successfully registered: ${successCount} commands`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} commands`);
  }
  console.log("\n💡 Note: It may take up to 1 hour for commands to appear in Discord.");
  console.log("   To update immediately, you can restart your Discord client.");
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

registerCommands();

