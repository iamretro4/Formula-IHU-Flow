# Setting Up Automatic Email Queue Processing

This guide shows you how to set up automatic processing of the email queue so emails are sent automatically.

## Method 1: Using Supabase pg_cron (Recommended if available)

### Step 1: Enable pg_cron Extension

1. Go to Supabase Dashboard → Database → Extensions
2. Search for "pg_cron"
3. Enable it (if available)

**Note:** pg_cron may not be available on all Supabase plans. If it's not available, use Method 2 or 3.

### Step 2: Run the Migration

Run the migration file: `20250117000000_setup_email_queue_cron.sql`

**Important:** Before running, you need to:
1. Replace `YOUR_PROJECT_REF` with your actual Supabase project reference
2. Get your Service Role Key from Supabase Dashboard → Settings → API
3. Set it as a database setting (see below)

### Step 3: Set Service Role Key

Run this SQL in Supabase SQL Editor (replace with your actual service role key):

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
```

### Step 4: Verify the Cron Job

Check if the job is scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-email-queue';
```

## Method 2: Using Vercel Cron (If deployed on Vercel)

If your app is deployed on Vercel, you can use Vercel Cron Jobs.

### Step 1: Create `vercel.json` with cron configuration

Add this to your existing `vercel.json`:

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
      "path": "/api/cron/process-email-queue",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Step 2: Create API Route

Create `api/cron/process-email-queue.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Invoke the Edge Function
    const { data, error } = await supabase.functions.invoke('process-email-queue');

    if (error) {
      console.error('Error processing email queue:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### Step 3: Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:
- `CRON_SECRET` - A secret token for authentication
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

## Method 3: Using GitHub Actions (Free)

Create `.github/workflows/process-email-queue.yml`:

```yaml
name: Process Email Queue

on:
  schedule:
    # Run every 5 minutes
    - cron: '*/5 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  process-queue:
    runs-on: ubuntu-latest
    steps:
      - name: Process Email Queue
        run: |
          curl -X POST \
            "https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/process-email-queue" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

Set secrets in GitHub:
- `SUPABASE_PROJECT_REF` - Your project reference (e.g., `hirifbecooazbevauffq`)
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

## Method 4: Using External Cron Service

### Option A: EasyCron / Cron-Job.org

1. Sign up at [cron-job.org](https://cron-job.org) (free)
2. Create a new cron job:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue`
   - Method: POST
   - Headers:
     - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type: application/json`
   - Schedule: Every 5 minutes (`*/5 * * * *`)

### Option B: Use a Simple HTTP Endpoint

Create a simple endpoint that can be called by any cron service.

## Method 5: Manual Processing (For Testing)

You can manually invoke the function:

```typescript
// In browser console or your code
await supabase.functions.invoke('process-email-queue');
```

Or via cURL:

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

## Recommended Schedule

- **Every 5 minutes**: Good balance between responsiveness and API usage
- **Every 1 minute**: More responsive but higher API usage
- **Every 15 minutes**: Lower API usage but slower delivery

## Testing

After setting up, test by:

1. Create a notification in the app
2. Check the email queue:
   ```sql
   SELECT * FROM email_queue WHERE status = 'pending' ORDER BY created_at DESC;
   ```
3. Wait for the cron job to run (or trigger manually)
4. Check the queue again - emails should be marked as 'sent'
5. Check your email inbox

## Troubleshooting

### Emails not being sent

1. Check if the cron job is running:
   ```sql
   SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-email-queue') ORDER BY start_time DESC LIMIT 10;
   ```

2. Check email queue status:
   ```sql
   SELECT status, COUNT(*) FROM email_queue GROUP BY status;
   ```

3. Check Edge Function logs in Supabase Dashboard

4. Verify Resend API key is set in Supabase Secrets

### pg_cron not available

If pg_cron is not available in your Supabase plan, use Method 2, 3, or 4 instead.

## Security Notes

- **Never expose your Service Role Key** in client-side code
- Use environment variables for all secrets
- Consider adding authentication to cron endpoints
- Use HTTPS for all requests

