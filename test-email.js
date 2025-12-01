/**
 * Simple test script for Resend email integration
 * 
 * Usage:
 * 1. Open your app in the browser
 * 2. Open Developer Console (F12)
 * 3. Copy and paste this entire script
 * 4. Update the email address and run
 */

// Get Supabase client (adjust import if needed)
// For browser console, you can use:
const testEmail = async () => {
  // Replace with your actual Supabase URL and anon key
  const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., 'https://xxxxx.supabase.co'
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
  
  // Test email address - CHANGE THIS!
  const testEmailAddress = 'your-email@example.com';
  
  try {
    console.log('🚀 Testing Resend email integration...');
    
    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test 1: Direct email send
    console.log('📧 Sending test email...');
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: testEmailAddress,
        subject: '✅ Test Email from Formula IHU',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #3b82f6;">Formula IHU - Email Test</h1>
            <p>This is a test email to verify that Resend is working correctly.</p>
            <p><strong>Status:</strong> ✅ Email service is operational</p>
            <p><strong>Domain:</strong> fihu.gr</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated test email from the Formula IHU Preparation Hub.</p>
          </div>
        `,
        from: 'noreply@fihu.gr'
      }
    });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('✅ Success!', data);
    console.log(`📬 Check your inbox at ${testEmailAddress}`);
    console.log('📋 Email ID:', data.id);
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
};

// Run the test
testEmail();

