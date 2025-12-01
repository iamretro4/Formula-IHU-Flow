/**
 * Script to register the /addtask slash command with Discord
 * 
 * Usage:
 *   node scripts/register-discord-command.js
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

const commandData = {
  name: "addtask",
  description: "Add a new task to the task manager",
  options: [
    {
      name: "content",
      description: "The content/description of the task",
      type: 3, // STRING type
      required: true,
    },
  ],
};

async function registerCommand() {
  try {
    console.log("📝 Registering /addtask command with Discord...");

    const response = await fetch(
      `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commandData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Command registered successfully!");
    console.log("   Command ID:", data.id);
    console.log("   Command Name:", data.name);
    console.log("\n💡 Note: It may take up to 1 hour for the command to appear in Discord.");
    console.log("   To update immediately, you can restart your Discord client.");
  } catch (error) {
    console.error("❌ Error registering command:", error.message);
    process.exit(1);
  }
}

registerCommand();

