# Google Calendar Sync Setup Guide

This guide will help you set up Google Calendar synchronization for your application.

## Prerequisites

1. A Google Cloud Project with the Calendar API enabled
2. OAuth 2.0 credentials (Client ID and Client Secret)
3. Supabase project with Edge Functions enabled

## Step 1: Create Google Cloud Project and OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - **Authorised JavaScript origins** (add these):
     - `http://localhost:8000` (for local development)
     - `https://hirifbecooazbevauffq.supabase.co` (for production)
     - Add your production domain if you have a custom domain deployed
   - **Authorised redirect URIs** (add these):
     - `https://hirifbecooazbevauffq.supabase.co/functions/v1/google-calendar-oauth` (production)
     - `http://localhost:54321/functions/v1/google-calendar-oauth` (local development, if using local Supabase)
   - Save and note your **Client ID** and **Client Secret**

## Step 2: Configure Supabase Environment Variables

1. Go to your Supabase Dashboard
2. Navigate to "Project Settings" > "Edge Functions"
3. Add the following environment variables:
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret

## Step 3: Deploy Edge Functions

Deploy the Google Calendar Edge Functions to Supabase:

```bash
# Deploy OAuth handler
supabase functions deploy google-calendar-oauth

# Deploy sync handler
supabase functions deploy google-calendar-sync
```

## Step 4: Verify Database Schema

Ensure the `calendar_connections` table exists. It should have been created by the migration:
`supabase/migrations/20250112000000_advanced_features.sql`

If not, run this SQL in your Supabase SQL Editor:

```sql
-- Create calendar providers enum
CREATE TYPE public.calendar_provider AS ENUM ('google', 'outlook', 'ical');

-- Create calendar connections table
CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider public.calendar_provider NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT,
  calendar_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own calendar connections"
  ON public.calendar_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar connections"
  ON public.calendar_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar connections"
  ON public.calendar_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## Step 5: Test the Integration

1. Navigate to the Calendar page in your application
2. Click "Calendar Settings"
3. Click "Connect Google Calendar"
4. You'll be redirected to Google to authorize the application
5. After authorization, you'll be redirected back to the calendar page
6. You should see a success message and the connection status

## Features

### Two-Way Sync

- **Sync to Google**: Syncs your app events (tasks, milestones, deadlines) to Google Calendar
- **Sync from Google**: Fetches events from Google Calendar (90 days ahead)

### Event Types Supported

- Tasks (with due dates)
- Milestones
- Document deadlines
- Meetings

### Automatic Token Refresh

The sync function automatically refreshes expired access tokens using the refresh token.

## Troubleshooting

### "Failed to initiate Google Calendar connection"

- Verify `GOOGLE_CLIENT_ID` is set in Supabase Edge Functions environment variables
- Check that the redirect URI matches exactly in Google Cloud Console
- Ensure the Google Calendar API is enabled

### "No active Google Calendar connection found"

- Make sure you've completed the OAuth flow
- Check the `calendar_connections` table in Supabase to verify the connection exists
- Ensure `is_active` is set to `true`

### "Unauthorized" errors

- Verify `GOOGLE_CLIENT_SECRET` is set correctly
- Check that tokens haven't been revoked in Google Account settings
- Try disconnecting and reconnecting the calendar

### Sync not working

- Check Edge Function logs in Supabase Dashboard
- Verify the calendar connection is active
- Ensure events have valid dates/times
- Check that the Google Calendar API quota hasn't been exceeded

## Security Notes

- Access tokens are stored encrypted in the database
- Refresh tokens are used to automatically renew access
- RLS policies ensure users can only access their own connections
- Tokens are never exposed to the client-side code

## API Quotas

Google Calendar API has the following quotas:
- 1,000,000 queries per day (default)
- 1,000 queries per 100 seconds per user

Monitor your usage in Google Cloud Console to avoid hitting limits.

