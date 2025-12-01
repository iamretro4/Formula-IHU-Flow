# Fix Discord Verification Error

## ✅ Good News: Your Function IS Deployed!

The test shows your function is deployed (we got a 401 response, which means it's running). The issue is that Discord can't verify it because the environment variables aren't set yet.

## Quick Fix Steps

### Step 1: Set Environment Variables in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** (gear icon) → **Edge Functions** → **Secrets**
4. Click **"Add new secret"** and add these two:

   **Secret 1:**
   - Name: `DISCORD_PUBLIC_KEY`
   - Value: `4dd108294776df53fa67be61c1de982cbc982af9165f784b64574d89f7ff61dc`
   - Click **Save**

   **Secret 2:**
   - Name: `DISCORD_BOT_TOKEN`
   - Value: `YOUR_DISCORD_BOT_TOKEN_HERE`
   - Click **Save**

### Step 2: Redeploy the Function (to pick up new secrets)

After setting the secrets, you need to redeploy so the function can access them:

```bash
supabase functions deploy discord-interactions
```

Or if you don't have Supabase CLI:
- Go to Supabase Dashboard → Edge Functions
- Find `discord-interactions`
- Click the three dots menu → **Redeploy** (or just wait - Supabase auto-redeploys when secrets change)

### Step 3: Test Again

Run the test script:
```powershell
powershell -ExecutionPolicy Bypass -File test-discord-endpoint.ps1
```

You should still get 401 (because we're not sending proper Discord signatures), but that's OK - it means the function is working.

### Step 4: Set Discord Endpoint URL

Now go back to Discord Developer Portal:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications/1445078785912471734)
2. Navigate to **Interactions** → **Interactions Endpoint URL**
3. Enter: `https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions`
4. Click **"Save Changes"**

Discord will automatically send a verification request. If everything is set up correctly, it should verify successfully! ✅

## Why This Happens

Discord sends a verification request with:
- A PING interaction (type 1)
- Proper signature headers (`x-signature-ed25519` and `x-signature-timestamp`)

Your function needs the `DISCORD_PUBLIC_KEY` to verify these signatures. Without it, verification fails and Discord can't confirm your endpoint is valid.

## Verification Checklist

- [x] Function is deployed ✅ (confirmed by test)
- [ ] `DISCORD_PUBLIC_KEY` secret is set in Supabase
- [ ] `DISCORD_BOT_TOKEN` secret is set in Supabase
- [ ] Function is redeployed after setting secrets
- [ ] Discord Interactions Endpoint URL is set
- [ ] Verification succeeds in Discord Developer Portal

## Still Not Working?

1. **Wait a few minutes** - Sometimes it takes time for secrets to propagate
2. **Check Supabase Function Logs**:
   - Go to Supabase Dashboard → Edge Functions → discord-interactions → Logs
   - Look for any errors about missing environment variables
3. **Verify secrets are set correctly**:
   - Make sure there are no extra spaces
   - Make sure the public key is the full 64-character hex string
4. **Try redeploying again**:
   ```bash
   supabase functions deploy discord-interactions --no-verify-jwt
   ```

