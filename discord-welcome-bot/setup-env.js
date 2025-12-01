// Quick setup script to create .env file
const fs = require('fs');
const path = require('path');

const envContent = `# Discord Welcome Bot Configuration
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
WELCOME_FUNCTION_URL=https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome
`;

const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists!');
} else {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('   All credentials are configured and ready to use!');
}

