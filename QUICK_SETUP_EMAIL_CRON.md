# Quick Setup: Automatic Email Processing

## Easiest Method: Use cron-job.org (Free, No Code Required)

### Step 1: Get Your Service Role Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (not the anon key!)

### Step 2: Set Up Cron Job
1. Go to [cron-job.org](https://cron-job.org) and sign up (free)
2. Click **"Create cronjob"**
3. Fill in:
   - **Title**: Process Email Queue
   - **Address**: `https://hirifbecooazbevauffq.supabase.co/functions/v1/process-email-queue`
   - **Schedule**: Every 5 minutes (`*/5 * * * *`)
   - **Request method**: POST
   - **Request headers**: 
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE
     Content-Type: application/json
     ```
   - **Request body**: `{}`
4. Click **"Create cronjob"**

### Step 3: Test It
1. Create a notification in your app
2. Wait 5 minutes (or trigger manually from cron-job.org)
3. Check your email!

## Alternative: Vercel Cron (If Deployed on Vercel)

Add this to your `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "crons": [
    {
      "path": "/api/cron/email-queue",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Then create `api/cron/email-queue.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.functions.invoke('process-email-queue');
  
  return new Response(JSON.stringify({ success: !error, data, error }), {
    status: error ? 500 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

Set environment variable in Vercel:
- `SUPABASE_SERVICE_ROLE_KEY` = Your service role key

## Test Manually First

Before setting up cron, test manually:

```bash
curl -X POST \
  'https://hirifbecooazbevauffq.supabase.co/functions/v1/process-email-queue' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

If it works, you'll see:
```json
{
  "message": "Email queue processed",
  "processed": 1,
  "failed": 0,
  "total": 1
}
```

## Recommended: cron-job.org

- ✅ Free
- ✅ No code changes needed
- ✅ Easy to set up
- ✅ Can trigger manually for testing
- ✅ View execution history
- ✅ Reliable

That's it! Your emails will now be sent automatically every 5 minutes.

