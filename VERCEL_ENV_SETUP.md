# Vercel Environment Variables Setup

## Required Environment Variables

Your Vercel deployment needs these environment variables to work correctly:

### Required (Critical)
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key

### Optional (Recommended)
- `VITE_BASE_URL` - Base URL for the application (e.g., `https://flow.fihu.gr`)
- `VITE_DOMAIN` - Domain name (e.g., `flow.fihu.gr`)
- `VITE_HUB_URL` - Hub subdomain URL (e.g., `https://hub.fihu.gr`)
- `VITE_MAIN_URL` - Main application URL (e.g., `https://fihu.gr`)

## How to Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`Formula-IHU-Flow` or similar)

### Step 2: Navigate to Settings
1. Click on your project
2. Go to **Settings** tab
3. Click on **Environment Variables** in the left sidebar

### Step 3: Add Variables
For each required variable:

1. Click **Add New**
2. Enter the variable name (e.g., `VITE_SUPABASE_URL`)
3. Enter the variable value
4. Select environments:
   - ✅ **Production**
   - ✅ **Preview** (optional, for preview deployments)
   - ✅ **Development** (optional, for local development)
5. Click **Save**

### Step 4: Redeploy
After adding environment variables:
1. Go to **Deployments** tab
2. Click the three dots (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

## Getting Supabase Values

### VITE_SUPABASE_URL
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** (e.g., `https://hirifbecooazbevauffq.supabase.co`)

### VITE_SUPABASE_PUBLISHABLE_KEY
1. In the same Supabase Settings → API page
2. Find **Project API keys**
3. Copy the **`anon` `public`** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. **Important:** Use the `anon` key, NOT the `service_role` key!

## Example Configuration

```
VITE_SUPABASE_URL=https://hirifbecooazbevauffq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcmlmYmVjb29hemJldmF1ZmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTA1MDYsImV4cCI6MjA3ODA4NjUwNn0.oPCNCdABAyfY_1jkBJUhW-xSsJFcoByonpJgQ-CPCd4
VITE_BASE_URL=https://flow.fihu.gr
VITE_DOMAIN=flow.fihu.gr
```

## Troubleshooting

### Error: "supabaseUrl is required"
- **Cause:** `VITE_SUPABASE_URL` is not set in Vercel
- **Solution:** Add `VITE_SUPABASE_URL` in Vercel Environment Variables and redeploy

### Error: "supabaseKey is required"
- **Cause:** `VITE_SUPABASE_PUBLISHABLE_KEY` is not set in Vercel
- **Solution:** Add `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel Environment Variables and redeploy

### Variables Not Working After Adding
1. Make sure you selected the correct environment (Production/Preview)
2. **Redeploy** your application after adding variables
3. Variables are only available in new deployments, not existing ones

### Check if Variables Are Set
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all required variables are listed
3. Check that they're enabled for the correct environments

## Important Notes

1. **Vite Prefix:** All variables must start with `VITE_` to be exposed to client-side code
2. **Case Sensitive:** Variable names are case-sensitive
3. **No Quotes:** Don't wrap values in quotes when setting in Vercel
4. **Redeploy Required:** Always redeploy after adding/changing environment variables
5. **Security:** Never commit `.env` files with real values to git

## Quick Checklist

- [ ] `VITE_SUPABASE_URL` is set in Vercel
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` is set in Vercel
- [ ] Variables are enabled for Production environment
- [ ] Application has been redeployed after adding variables
- [ ] No quotes around variable values
- [ ] Using the `anon` key (not `service_role`)

