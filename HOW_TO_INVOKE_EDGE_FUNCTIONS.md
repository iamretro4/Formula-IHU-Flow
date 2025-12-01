# How to Invoke Supabase Edge Functions

## Method 1: Via Supabase Dashboard (Easiest for Testing)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions** in the sidebar
4. Click on the function you want to invoke (e.g., `send-email`)
5. Click the **"Invoke Function"** button
6. Enter your payload in JSON format:
   ```json
   {
     "to": "test@example.com",
     "subject": "Test Email",
     "html": "<h1>Test</h1>",
     "from": "noreply@fihu.gr"
   }
   ```
7. Click **"Invoke"**
8. View the response and logs

## Method 2: Via JavaScript/TypeScript (In Your App)

### Using Supabase Client

```typescript
import { supabase } from "@/integrations/supabase/client";

// Basic invocation
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<h1>Hello</h1>',
    from: 'noreply@fihu.gr'
  }
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
}
```

### With Error Handling

```typescript
try {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: 'user@example.com',
      subject: 'Test Email',
      html: '<h1>Hello</h1>',
      from: 'noreply@fihu.gr'
    }
  });

  if (error) {
    throw error;
  }

  console.log('Email sent:', data);
} catch (err) {
  console.error('Failed to send email:', err);
}
```

## Method 3: Via HTTP Request (cURL, Postman, etc.)

### Using cURL

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1>",
    "from": "noreply@fihu.gr"
  }'
```

### Using fetch (Browser/Node.js)

```javascript
const response = await fetch(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<h1>Test</h1>',
      from: 'noreply@fihu.gr'
    })
  }
);

const data = await response.json();
console.log(data);
```

## Method 4: Via Supabase CLI

```bash
# Invoke a function
supabase functions invoke send-email \
  --body '{"to":"test@example.com","subject":"Test","html":"<h1>Test</h1>"}'
```

## Method 5: Via Browser Console (Quick Test)

1. Open your app in the browser
2. Press F12 to open Developer Console
3. Run this code:

```javascript
// Make sure you're logged in first
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'your-email@example.com',
    subject: 'Test Email',
    html: '<h1>Test</h1><p>This is a test email.</p>',
    from: 'noreply@fihu.gr'
  }
});

console.log('Response:', data);
console.log('Error:', error);
```

## Examples from Your Codebase

### Example 1: Sending Email (from WorkflowDialog.tsx)

```typescript
const { error: emailError } = await supabase.functions.invoke("send-email", {
  body: {
    to: profiles.find(p => p.id === approverId)?.email,
    subject: `Approval Request: ${documentTitle}`,
    html: `
      <h2>Approval Request</h2>
      <p>You have been requested to approve a document.</p>
    `,
  },
});
```

### Example 2: Google Calendar OAuth (from useCalendarConnection.ts)

```typescript
const { data, error } = await supabase.functions.invoke("google-calendar-oauth", {
  body: { action: "initiate" },
});
```

## Testing the `send-email` Function

### Quick Test Payload

```json
{
  "to": "your-email@example.com",
  "subject": "Test Email from Formula IHU",
  "html": "<h1>Test Email</h1><p>This is a test to verify Resend is working.</p>",
  "from": "noreply@fihu.gr"
}
```

### Testing `process-email-queue` Function

This function doesn't need a body - it processes pending emails from the queue:

```typescript
const { data, error } = await supabase.functions.invoke('process-email-queue');
```

Or via cURL:
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'
```

## Authentication

### Using Anon Key (Public)
- Works for functions that don't require authentication
- Use `VITE_SUPABASE_ANON_KEY` from your environment

### Using Service Role Key (Admin)
- For functions that need admin access
- **Never expose this in client-side code!**
- Only use in server-side code or Edge Functions

### Using User Session
- The Supabase client automatically includes the user's session token
- Functions can access `auth.uid()` to get the current user

## Common Issues

### 1. Function Not Found (404)
- **Solution**: Deploy the function first:
  ```bash
  supabase functions deploy send-email
  ```

### 2. Unauthorized (401)
- **Solution**: Check that you're passing the correct authorization header
- Make sure you're using the anon key for public functions

### 3. CORS Errors
- **Solution**: Edge Functions should handle CORS automatically
- Check that the function includes CORS headers

### 4. Missing Environment Variables
- **Solution**: Set secrets in Supabase Dashboard:
  - Go to Project Settings → Edge Functions → Secrets
  - Add required secrets (e.g., `RESEND_API_KEY`)

## Getting Your Project Reference

1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → API
4. Your project URL looks like: `https://xxxxx.supabase.co`
5. The `xxxxx` part is your project reference

## Full Example: Testing send-email

```typescript
import { supabase } from "@/integrations/supabase/client";

async function testSendEmail() {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: 'test@example.com',
        subject: 'Test Email from Formula IHU',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h1>Test Email</h1>
            <p>This is a test email to verify Resend is working.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `,
        from: 'noreply@fihu.gr'
      }
    });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Success!', data);
    // Expected: { success: true, id: "re_xxxxx" }
  } catch (err) {
    console.error('Failed:', err);
  }
}

// Call it
testSendEmail();
```

## Viewing Function Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click on the function name
3. Click on "Logs" tab
4. View real-time logs and errors

