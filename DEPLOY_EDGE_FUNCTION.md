# Quick Guide: Deploy Google Calendar Edge Function

## The Problem
You're getting "failed to send a request to the Edge Function" because the function isn't deployed yet.

## Solution: Deploy via Supabase Dashboard (Easiest Method)

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/hirifbecooazbevauffq
2. Click **"Edge Functions"** in the left sidebar

### Step 2: Create the Function
1. Click **"Create a new function"** button (or "New Function")
2. Name it exactly: `google-calendar-oauth` (case-sensitive, no spaces)
3. Click **"Create function"**

### Step 3: Add the Code
1. Open the file: `supabase/functions/google-calendar-oauth/index.ts` in your code editor
2. Copy **ALL** the contents (Ctrl+A, Ctrl+C)
3. In the Supabase Dashboard function editor, delete any default code
4. Paste the code (Ctrl+V)
5. Click **"Deploy"** or **"Save"**

### Step 4: Set Environment Variables
1. Go to **Project Settings** > **Edge Functions** (or click the settings icon)
2. Under **"Secrets"**, add:
   - Name: `GOOGLE_CLIENT_ID`
     Value: (Your Google OAuth Client ID)
   - Name: `GOOGLE_CLIENT_SECRET`
     Value: (Your Google OAuth Client Secret)
3. Click **"Save"** for each secret

### Step 5: Test
1. Go back to your app
2. Try connecting to Google Calendar again
3. It should work now!

## Alternative: Deploy via CLI

If you have Supabase CLI installed:

```bash
# Make sure you're in the project directory
cd c:\Users\anton\OneDrive\Documents\ihuflow\ihuflow-prep-hub

# Link to your project (if not already linked)
supabase link --project-ref hirifbecooazbevauffq

# Deploy the function
supabase functions deploy google-calendar-oauth
```

## Verify Deployment

After deploying, you should see:
- The function listed in Edge Functions
- Status showing as "Active" or "Deployed"
- You can click on it to see logs

## Still Not Working?

1. **Check function name**: Must be exactly `google-calendar-oauth` (no typos)
2. **Check logs**: Click on the function > "Logs" tab to see any errors
3. **Verify environment variables**: Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
4. **Wait a moment**: Sometimes it takes 10-30 seconds for the function to be fully available

