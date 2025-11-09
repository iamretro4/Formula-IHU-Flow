# Troubleshooting Google Calendar Sync

## Error: "Failed to send a request to the Edge Function"

This error typically means the Edge Function is not deployed or not accessible. Follow these steps:

### Step 1: Verify Edge Function is Deployed

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Check if `google-calendar-oauth` is listed
4. If not, you need to deploy it (see Step 2)

### Step 2: Deploy the Edge Function

**Option A: Using Supabase CLI (Recommended)**

```bash
# Make sure you're in the project root
cd /path/to/ihuflow-prep-hub

# Link to your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy google-calendar-oauth
```

**Option B: Using Supabase Dashboard**

1. Go to Supabase Dashboard > Edge Functions
2. Click "Create a new function"
3. Name it `google-calendar-oauth`
4. Copy the contents of `supabase/functions/google-calendar-oauth/index.ts`
5. Paste into the function editor
6. Click "Deploy"

### Step 3: Verify Environment Variables

The Edge Function needs these environment variables:

1. Go to Supabase Dashboard > Project Settings > Edge Functions
2. Add these secrets:
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret

**To get Google OAuth credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable "Google Calendar API"
4. Go to "Credentials" > "Create Credentials" > "OAuth client ID"
5. Choose "Web application"
6. **Authorised JavaScript origins** (add these):
   - `http://localhost:8000` (for local development)
   - `https://hirifbecooazbevauffq.supabase.co` (for production)
   - Add your production domain if you have one deployed
7. **Authorised redirect URIs** (add these):
   - `https://hirifbecooazbevauffq.supabase.co/functions/v1/google-calendar-oauth` (production)
   - `http://localhost:54321/functions/v1/google-calendar-oauth` (local development, if using local Supabase)
8. Save and note your **Client ID** and **Client Secret**

### Step 4: Test the Function

After deploying, test the function:

1. Open browser console (F12)
2. Try connecting to Google Calendar
3. Check the console for detailed error messages
4. Check Supabase Dashboard > Edge Functions > `google-calendar-oauth` > Logs

### Step 5: Common Issues

#### Issue: "Missing authorization header"
- **Solution**: Make sure you're logged in to the app

#### Issue: "GOOGLE_CLIENT_ID not configured"
- **Solution**: Add `GOOGLE_CLIENT_ID` to Edge Function secrets in Supabase Dashboard

#### Issue: "Edge Function not deployed"
- **Solution**: Deploy the function using CLI or Dashboard (see Step 2)

#### Issue: CORS errors
- **Solution**: The function already includes CORS headers. If you still see CORS errors, check that the function is deployed correctly.

#### Issue: Function returns 404
- **Solution**: 
  - Verify the function name is exactly `google-calendar-oauth` (case-sensitive)
  - Make sure the function is deployed
  - Check that you're using the correct Supabase project

### Step 6: Check Function Logs

1. Go to Supabase Dashboard > Edge Functions > `google-calendar-oauth`
2. Click on "Logs" tab
3. Try connecting again
4. Check the logs for detailed error messages

### Step 7: Manual Function Test

You can test the function manually using curl:

```bash
# Get your access token from the app (check browser Network tab)
# Replace YOUR_ACCESS_TOKEN with your actual access token

curl -X POST \
  'https://hirifbecooazbevauffq.supabase.co/functions/v1/google-calendar-oauth' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action": "initiate"}'
```

Expected response:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "..."
}
```

### Still Having Issues?

1. **Check browser console** for detailed error messages
2. **Check Supabase function logs** for server-side errors
3. **Verify**:
   - You're logged in
   - Edge Function is deployed
   - Environment variables are set
   - Google OAuth credentials are correct
   - Redirect URI matches in Google Cloud Console

### Quick Checklist

- [ ] Edge Function `google-calendar-oauth` is deployed
- [ ] `GOOGLE_CLIENT_ID` is set in Supabase Edge Function secrets
- [ ] `GOOGLE_CLIENT_SECRET` is set in Supabase Edge Function secrets
- [ ] Google Calendar API is enabled in Google Cloud Console
- [ ] Redirect URI is added to Google OAuth credentials
- [ ] You're logged in to the app
- [ ] Function logs show no errors

