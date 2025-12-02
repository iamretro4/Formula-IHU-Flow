// Discord Welcome Bot
// Automatically sends welcome messages when new members join the server
// Calls the Supabase discord-welcome function

const { Client, GatewayIntentBits } = require('discord.js');

// Load environment variables from .env file (for local development)
// Railway and other platforms use environment variables directly
try {
  require('dotenv').config();
} catch (error) {
  // dotenv not available or .env file not found - use environment variables directly
  // This is fine for Railway and other cloud platforms
}

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers  // Required for guildMemberAdd event
    // Note: GuildMembers is a privileged intent that must be enabled in Discord Developer Portal
  ] 
});

// Debug: Log all environment variables (masked for security)
console.log('🔍 Environment check:');
console.log('   DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? '✅ Set (' + process.env.DISCORD_BOT_TOKEN.substring(0, 20) + '...)' : '❌ Missing');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set (' + process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...)' : '❌ Missing');
console.log('   WELCOME_FUNCTION_URL:', process.env.WELCOME_FUNCTION_URL || 'Using default');
console.log('');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WELCOME_FUNCTION_URL = process.env.WELCOME_FUNCTION_URL || 
  'https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome';
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID; // Optional: specific channel

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ Error: DISCORD_BOT_TOKEN is required!');
  console.error('');
  console.error('💡 Railway Troubleshooting:');
  console.error('   1. Go to Railway Dashboard → Your Project');
  console.error('   2. Click on your SERVICE (not just project)');
  console.error('   3. Go to Variables tab');
  console.error('   4. Make sure variable name is exactly: DISCORD_BOT_TOKEN');
  console.error('   5. Check there are no extra spaces in the name or value');
  console.error('   6. After adding, Railway should auto-restart');
  console.error('   7. If still not working, try manually redeploying');
  console.error('');
  console.error('   For local: Set it in your .env file');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: SUPABASE_ANON_KEY is required!');
  console.error('');
  console.error('💡 Railway Troubleshooting:');
  console.error('   1. Go to Railway Dashboard → Your Project');
  console.error('   2. Click on your SERVICE (not just project)');
  console.error('   3. Go to Variables tab');
  console.error('   4. Make sure variable name is exactly: SUPABASE_ANON_KEY');
  console.error('   5. Check there are no extra spaces in the name or value');
  console.error('   6. After adding, Railway should auto-restart');
  console.error('');
  console.error('   For local: Set it in your .env file');
  process.exit(1);
}

client.once('ready', () => {
  console.log('✅ Discord Welcome Bot is ready!');
  console.log(`   Logged in as: ${client.user.tag}`);
  console.log(`   Watching for new members...`);
  console.log(`   Welcome function: ${WELCOME_FUNCTION_URL}`);
  if (WELCOME_CHANNEL_ID) {
    console.log(`   Welcome channel: ${WELCOME_CHANNEL_ID}`);
  } else {
    console.log(`   Welcome channel: System channel (auto-detect)`);
  }
});

client.on('guildMemberAdd', async (member) => {
  console.log(`\n👋 New member joined: ${member.user.tag} (${member.user.id})`);
  console.log(`   Server: ${member.guild.name} (${member.guild.id})`);

  try {
    // Determine welcome channel
    let welcomeChannelId = WELCOME_CHANNEL_ID;
    
    if (!welcomeChannelId) {
      // Try to use system channel
      if (member.guild.systemChannelId) {
        welcomeChannelId = member.guild.systemChannelId;
        console.log(`   Using system channel: ${member.guild.systemChannel?.name || welcomeChannelId}`);
      } else {
        // Try to find a welcome or general channel
        const welcomeChannel = member.guild.channels.cache.find(
          ch => (ch.name === 'welcome' || ch.name === 'general' || ch.name === 'roles') && 
          ch.type === 0 // GUILD_TEXT
        );
        
        if (welcomeChannel) {
          welcomeChannelId = welcomeChannel.id;
          console.log(`   Using channel: ${welcomeChannel.name} (${welcomeChannelId})`);
        } else {
          // Get first text channel as fallback
          const firstChannel = member.guild.channels.cache.find(ch => ch.type === 0);
          if (firstChannel) {
            welcomeChannelId = firstChannel.id;
            console.log(`   Using fallback channel: ${firstChannel.name} (${welcomeChannelId})`);
          }
        }
      }
    }

    if (!welcomeChannelId) {
      console.error('   ❌ Could not find a welcome channel!');
      console.error('   Please set WELCOME_CHANNEL_ID in .env or set a system channel in Discord');
      return;
    }

    // Call the Supabase welcome function
    console.log(`   📤 Sending welcome message...`);
    
    const response = await fetch(WELCOME_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'guild_member_add',
        guild_id: member.guild.id,
        user: {
          id: member.user.id,
          username: member.user.username,
          global_name: member.user.globalName,
        },
        channel_id: welcomeChannelId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`   ✅ Welcome message sent successfully!`);
    } else {
      console.error(`   ⚠️  Welcome function returned: ${JSON.stringify(result)}`);
    }

  } catch (error) {
    console.error(`   ❌ Error sending welcome message:`, error.message);
    console.error(`   Stack:`, error.stack);
  }
});

// Handle errors
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Login to Discord
console.log('🚀 Starting Discord Welcome Bot...');
client.login(DISCORD_BOT_TOKEN).catch((error) => {
  console.error('❌ Failed to login:', error);
  process.exit(1);
});

