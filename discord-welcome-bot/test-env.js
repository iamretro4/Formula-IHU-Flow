// Quick test script to check environment variables
console.log('🔍 Checking environment variables...\n');

const requiredVars = [
  'DISCORD_BOT_TOKEN',
  'SUPABASE_ANON_KEY',
  'WELCOME_FUNCTION_URL'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    const masked = varName.includes('TOKEN') || varName.includes('KEY') 
      ? value.substring(0, 20) + '...' + value.substring(value.length - 10)
      : value;
    console.log(`✅ ${varName}: ${masked}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allPresent = false;
  }
});

console.log('\n' + '='.repeat(50));
if (allPresent) {
  console.log('✅ All required environment variables are set!');
} else {
  console.log('❌ Some environment variables are missing!');
  console.log('\n💡 In Railway:');
  console.log('   1. Go to your project → Variables tab');
  console.log('   2. Make sure variables are set at the SERVICE level (not just project level)');
  console.log('   3. Check for typos in variable names');
  console.log('   4. After adding, Railway should auto-restart');
}
console.log('='.repeat(50));

process.exit(allPresent ? 0 : 1);



