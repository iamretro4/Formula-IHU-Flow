# Your Discord Function URL

## ✅ Your Supabase Edge Function URL

```
https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions
```

## How to Use This URL

1. **Go to Discord Developer Portal**: https://discord.com/developers/applications/1445078785912471734
2. **Navigate to**: Interactions → Interactions Endpoint URL
3. **Paste this URL**: `https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions`
4. **Click "Save Changes"**

## Important Notes

⚠️ **Before the URL will work, you must:**

1. ✅ Deploy the edge function first:
   ```bash
   supabase functions deploy discord-interactions
   ```

2. ✅ Set the environment variables in Supabase Dashboard:
   - Go to: Project Settings → Edge Functions → Secrets
   - Add:
     - `DISCORD_PUBLIC_KEY` = `4dd108294776df53fa67be61c1de982cbc982af9165f784b64574d89f7ff61dc`
     - `DISCORD_BOT_TOKEN` = `YOUR_DISCORD_BOT_TOKEN_HERE`

3. ✅ Run the database migration to add `content` and `discord_user_id` columns

## Testing the URL

After deploying, you can test if the function is accessible:

```bash
curl https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions
```

You should get a response (even if it's an error about missing Discord signature, that's expected - it means the function is deployed).

## Project Reference

Your Supabase project reference is: **`hirifbecooazbevauffq`**

This is found in:
- Your Supabase dashboard URL
- Your `supabase/config.toml` file
- Your environment variables

