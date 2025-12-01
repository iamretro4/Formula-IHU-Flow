# Discord Interactions Endpoint - Troubleshooting

## Error: "The specified interactions endpoint url could not be verified"

This error means Discord cannot reach or verify your endpoint. Follow these steps:

## Step 1: Deploy the Function First ⚠️ CRITICAL

**The function MUST be deployed before Discord can verify it!**

### Option A: Using Supabase CLI

```bash
# Make sure you have Supabase CLI installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (use your project ref: hirifbecooazbevauffq)
supabase link --project-ref hirifbecooazbevauffq

# Deploy the function
supabase functions deploy discord-interactions
```

### Option B: Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Edge Functions** in the sidebar
4. Click **"Deploy Function"** or **"New Function"**
5. Upload the `supabase/functions/discord-interactions` folder
   - Or create it manually and paste the code from `index.ts`

## Step 2: Set Environment Variables

Before deploying, set these secrets in Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add these secrets:
   - `DISCORD_PUBLIC_KEY` = `4dd108294776df53fa67be61c1de982cbc982af9165f784b64574d89f7ff61dc`
   - `DISCORD_BOT_TOKEN` = `YOUR_DISCORD_BOT_TOKEN_HERE`

(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are usually auto-set)

## Step 3: Test the Function is Deployed

After deploying, test if the function is accessible:

```bash
# Test with curl (should return an error about missing signature, which is expected)
curl -X POST https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions \
  -H "Content-Type: application/json" \
  -d '{"type": 1}'
```

Expected response: Either a JSON error about unauthorized (401) or a PONG response `{"type":1}`

If you get a 404, the function isn't deployed yet.

## Step 4: Test Discord Verification Request

Discord sends a PING (type 1) to verify the endpoint. Test this manually:

```bash
curl -X POST https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions \
  -H "Content-Type: application/json" \
  -d '{"type": 1}'
```

Expected response: `{"type":1}` (PONG)

## Step 5: Configure Discord After Deployment

**ONLY after the function is deployed:**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications/1445078785912471734)
2. Navigate to **Interactions** → **Interactions Endpoint URL**
3. Enter: `https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions`
4. Click **"Save Changes"**

Discord will automatically send a verification request. If the function is deployed and working, it should verify successfully.

## Common Issues

### Issue 1: Function Not Found (404)
**Solution**: Deploy the function first using the steps above.

### Issue 2: 401 Unauthorized
**Solution**: 
- Check that `DISCORD_PUBLIC_KEY` is set correctly in Supabase secrets
- The public key should be: `4dd108294776df53fa67be61c1de982cbc982af9165f784b64574d89f7ff61dc`

### Issue 3: Function Deployed But Still Can't Verify
**Possible causes:**
1. **CORS issues** - The function should handle CORS (it does in the code)
2. **Signature verification failing** - Check the public key is correct
3. **Function not responding to PING** - The function should return `{"type":1}` for PING requests

### Issue 4: Wrong Function URL
**Solution**: Make sure you're using:
```
https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions
```

NOT:
- `https://hirifbecooazbevauffq.supabase.co/rest/v1/...` (wrong path)
- `https://hirifbecooazbevauffq.supabase.co/functions/discord-interactions` (missing /v1/)

## Verification Checklist

- [ ] Function is deployed (check Supabase Dashboard → Edge Functions)
- [ ] Environment variables are set (DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN)
- [ ] Function URL is correct: `https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions`
- [ ] Function responds to test requests (curl test works)
- [ ] Discord Interactions Endpoint URL is set AFTER deployment

## Quick Test Script

Save this as `test-discord-endpoint.ps1` and run it:

```powershell
# Test Discord endpoint
$url = "https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions"
$body = @{ type = 1 } | ConvertTo-Json

Write-Host "Testing Discord endpoint..."
Write-Host "URL: $url"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Success! Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
```

## Still Having Issues?

1. **Check Supabase Function Logs**:
   - Go to Supabase Dashboard → Edge Functions → discord-interactions → Logs
   - Look for any errors

2. **Check Discord Developer Portal Logs**:
   - Go to Discord Developer Portal → Interactions → Logs
   - See what Discord is receiving

3. **Verify Function Code**:
   - Make sure `supabase/functions/discord-interactions/index.ts` exists
   - Check that it handles PING (type 1) correctly

4. **Contact Support**:
   - Supabase: Check function logs and deployment status
   - Discord: Check interaction logs in Developer Portal

