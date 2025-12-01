# How to Find Your Supabase Service Role Key

## Quick Steps

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **hirifbecooazbevauffq**
3. Navigate to **Settings** → **API**
4. Scroll down to **Project API keys**
5. Copy the **`service_role`** key (NOT the `anon` key!)
   - The `service_role` key has full access and should be kept secret
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Visual Guide

```
Supabase Dashboard
  └─ Your Project (hirifbecooazbevauffq)
      └─ Settings (gear icon)
          └─ API
              └─ Project API keys
                  ├─ anon public (safe to expose)
                  └─ service_role (SECRET - keep private!) ← Copy this one
```

## Important Notes

⚠️ **Security Warning:**
- The `service_role` key bypasses Row Level Security (RLS)
- Never commit it to version control
- Only use it in server-side code or Edge Functions
- Store it in Supabase Dashboard → Edge Functions → Secrets

## Where to Use It

1. **Supabase Edge Functions Secrets:**
   - Go to Dashboard → Edge Functions → Secrets
   - Add: `SUPABASE_SERVICE_ROLE_KEY=your_key_here`

2. **For Database Triggers:**
   - The trigger function needs this key to make HTTP requests
   - Set it as a database setting (see migration files)

## Your Project Details

- **Project Reference**: `hirifbecooazbevauffq`
- **Project URL**: `https://hirifbecooazbevauffq.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/hirifbecooazbevauffq

