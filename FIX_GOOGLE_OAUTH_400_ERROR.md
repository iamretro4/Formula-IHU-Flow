# Fix Google OAuth 400 Error

## The Problem
You're getting a 400 error from Google: "The server cannot process the request because it is malformed."

This usually means the **redirect URI** in the OAuth request doesn't match what's configured in Google Cloud Console.

## Solution

### Step 1: Check the Redirect URI Being Used

The Edge Function generates a redirect URI. To see what it's using:

1. Go to Supabase Dashboard > Edge Functions > `google-calendar-oauth`
2. Click on "Logs" tab
3. Try connecting to Google Calendar again
4. Look for log entries showing "OAuth redirect URI: ..."
5. Copy that exact URI

### Step 2: Verify in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Check the **Authorised redirect URIs** section
5. **The URI from Step 1 must EXACTLY match one of the URIs listed here**

### Step 3: Common Issues and Fixes

#### Issue: Redirect URI doesn't match
**The redirect URI should be:**
```
https://hirifbecooazbevauffq.supabase.co/functions/v1/google-calendar-oauth
```

**Make sure:**
- No trailing slash
- Exact path: `/functions/v1/google-calendar-oauth`
- Uses `https://` (not `http://`)
- Matches exactly (case-sensitive)

#### Issue: Client ID is wrong
- Verify `GOOGLE_CLIENT_ID` in Supabase Edge Function secrets matches your Google Cloud Console Client ID
- Make sure you're using the Client ID (not Client Secret)

#### Issue: Missing or incorrect configuration
1. **In Google Cloud Console:**
   - Authorised redirect URI: `https://hirifbecooazbevauffq.supabase.co/functions/v1/google-calendar-oauth`
   - Authorised JavaScript origins: `https://hirifbecooazbevauffq.supabase.co`

2. **In Supabase Dashboard:**
   - Go to Project Settings > Edge Functions > Secrets
   - Verify `GOOGLE_CLIENT_ID` is set correctly
   - Verify `GOOGLE_CLIENT_SECRET` is set correctly

### Step 4: Test Again

After fixing the redirect URI:
1. Wait 1-2 minutes for Google to update the configuration
2. Try connecting to Google Calendar again
3. If it still fails, check the browser console for the exact error

### Step 5: Debug the Redirect URI

If you want to see what redirect URI is being generated:

1. Open browser console (F12)
2. Go to Network tab
3. Try connecting to Google Calendar
4. Look for the request to `google-calendar-oauth` function
5. Check the response - it should contain `authUrl`
6. Copy the `authUrl` and look at the `redirect_uri` parameter
7. Compare it with what's in Google Cloud Console

### Quick Checklist

- [ ] Redirect URI in Google Cloud Console: `https://hirifbecooazbevauffq.supabase.co/functions/v1/google-calendar-oauth`
- [ ] No trailing slash on redirect URI
- [ ] `GOOGLE_CLIENT_ID` is set in Supabase Edge Function secrets
- [ ] `GOOGLE_CLIENT_SECRET` is set in Supabase Edge Function secrets
- [ ] Client ID in Supabase matches Client ID in Google Cloud Console
- [ ] Google Calendar API is enabled in Google Cloud Console
- [ ] OAuth consent screen is configured (if required)

### Still Not Working?

1. **Double-check the exact redirect URI:**
   - Check Edge Function logs for the generated URI
   - Make sure it matches EXACTLY in Google Cloud Console (no extra spaces, correct case)

2. **Try creating a new OAuth client:**
   - Sometimes it's easier to create a fresh OAuth client with the correct redirect URI from the start

3. **Check OAuth consent screen:**
   - Go to Google Cloud Console > APIs & Services > OAuth consent screen
   - Make sure it's configured (even for testing)

