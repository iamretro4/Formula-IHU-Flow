# Testing Resend Email Integration

## Prerequisites

1. **Verify Resend API Key is set in Supabase**:
   - Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Ensure `RESEND_API_KEY` is configured

2. **Verify Domain in Resend** (if using custom domain):
   - Go to [Resend Dashboard](https://resend.com/domains)
   - Ensure `fihu.gr` is verified (or use `onboarding@resend.dev` for testing)

3. **Deploy Edge Functions** (if not already deployed):
   ```bash
   supabase functions deploy send-email
   supabase functions deploy process-email-queue
   ```

## Method 1: Test via Supabase Dashboard

1. Go to Supabase Dashboard → Edge Functions → `send-email`
2. Click "Invoke Function"
3. Use this test payload:
   ```json
   {
     "to": "your-email@example.com",
     "subject": "Test Email from Formula IHU",
     "html": "<h1>Test Email</h1><p>This is a test email to verify Resend is working correctly.</p>",
     "from": "noreply@fihu.gr"
   }
   ```
4. Click "Invoke" and check the response
5. Check your email inbox

## Method 2: Test via Browser Console (in your app)

1. Open your app in the browser
2. Open Developer Console (F12)
3. Run this code:
   ```javascript
   const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
   const supabase = createClient(
     'YOUR_SUPABASE_URL',
     'YOUR_SUPABASE_ANON_KEY'
   );

   const { data, error } = await supabase.functions.invoke('send-email', {
     body: {
       to: 'your-email@example.com',
       subject: 'Test Email from Formula IHU',
       html: '<h1>Test Email</h1><p>This is a test email to verify Resend is working.</p>',
       from: 'noreply@fihu.gr'
     }
   });

   console.log('Response:', data);
   console.log('Error:', error);
   ```

## Method 3: Test via cURL

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email from Formula IHU",
    "html": "<h1>Test Email</h1><p>This is a test email.</p>",
    "from": "noreply@fihu.gr"
  }'
```

## Method 4: Test via Email Queue

1. Insert a test email into the queue:
   ```sql
   INSERT INTO public.email_queue (
     to_email,
     subject,
     html_content,
     from_email
   ) VALUES (
     'your-email@example.com',
     'Test Email from Queue',
     '<h1>Test Email</h1><p>This email was sent via the queue system.</p>',
     'noreply@fihu.gr'
   );
   ```

2. Invoke the `process-email-queue` function:
   - Via Dashboard: Edge Functions → `process-email-queue` → Invoke
   - Via cURL:
     ```bash
     curl -X POST \
       'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue' \
       -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'
     ```

3. Check the response and your email inbox

## Method 5: Test via Database Function

```sql
-- Test sending email via database function
SELECT public.send_email_via_edge_function(
  'your-email@example.com',
  'Test Email from Database',
  '<h1>Test Email</h1><p>This email was queued via the database function.</p>',
  'noreply@fihu.gr'
);

-- Then process the queue (via Edge Function or scheduled job)
```

## Expected Responses

### Success Response:
```json
{
  "success": true,
  "id": "re_xxxxxxxxxxxxx"
}
```

### Error Responses:

**Missing API Key:**
```json
{
  "error": "RESEND_API_KEY is not configured"
}
```

**Invalid Domain:**
```json
{
  "error": "Resend API error: Domain not verified"
}
```

**Missing Fields:**
```json
{
  "error": "Missing required fields: to, subject, html"
}
```

## Troubleshooting

1. **Check Edge Function Logs**:
   - Supabase Dashboard → Edge Functions → `send-email` → Logs
   - Look for error messages

2. **Verify API Key**:
   - Check Supabase Secrets are set correctly
   - Verify the key is active in Resend dashboard

3. **Check Domain Verification**:
   - If using custom domain, ensure DNS records are set
   - Use `onboarding@resend.dev` for initial testing

4. **Check Email Queue Status**:
   ```sql
   SELECT * FROM public.email_queue 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

5. **Check Resend Dashboard**:
   - Go to Resend Dashboard → Emails
   - See sent emails and any errors

## Quick Test Checklist

- [ ] Resend API key is set in Supabase
- [ ] Domain is verified in Resend (or using test domain)
- [ ] Edge Functions are deployed
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] Check spam folder if not received

