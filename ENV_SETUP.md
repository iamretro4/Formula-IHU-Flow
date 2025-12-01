# Environment Variables Setup Guide

## Overview

This project uses Vite, which requires environment variables to be prefixed with `VITE_` to be exposed to the client-side code.

## Quick Setup

1. Create a `.env.local` file in the root directory
2. Copy the template below and fill in your values
3. Restart your dev server if it's running

## Environment Variables Template

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Application URLs (Optional)
# Base URL for the main application
VITE_BASE_URL=http://localhost:8000

# Hub URL for cross-subdomain requests
# If not set, defaults to VITE_BASE_URL
VITE_HUB_URL=http://localhost:8000
```

## Production Example

```env
VITE_SUPABASE_URL=https://hirifbecooazbevauffq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_production_anon_key
VITE_BASE_URL=https://fihu.gr
VITE_HUB_URL=https://hub.fihu.gr
```

## Usage in Code

### Method 1: Direct Access (Simple)

```typescript
// Client-side only - must use import.meta.env
const baseUrl = import.meta.env.VITE_BASE_URL;
const hubUrl = import.meta.env.VITE_HUB_URL;
```

### Method 2: Using Utility Functions (Recommended)

```typescript
import { getBaseUrl, getHubUrl, fetchFromHub } from '@/utils/env';

// Get URLs
const baseUrl = getBaseUrl();
const hubUrl = getHubUrl();

// Make cross-subdomain requests
const fetchFromHub = async () => {
  const response = await fetchFromHub('/api/data', {
    method: 'GET',
    credentials: 'include', // Automatically included
  });
  return response.json();
};
```

### Method 3: Making Cross-Subdomain Requests

```typescript
import { fetchFromHub } from '@/utils/env';

// Example: Fetch data from hub subdomain
const fetchData = async () => {
  try {
    const response = await fetchFromHub('/api/data', {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from hub:', error);
    throw error;
  }
};
```

## Important Notes

### Vite vs Next.js Differences

| Next.js | Vite |
|---------|------|
| `NEXT_PUBLIC_*` prefix | `VITE_*` prefix |
| `process.env.NEXT_PUBLIC_*` | `import.meta.env.VITE_*` |
| `next.config.js` | `vite.config.ts` |

### Security

- **Never commit `.env.local`** to version control (it's in `.gitignore`)
- Only variables prefixed with `VITE_` are exposed to the client
- Server-side secrets should be stored in Supabase Edge Function secrets

### Type Safety

Type definitions are in `src/vite-env.d.ts`. TypeScript will provide autocomplete and type checking for environment variables.

## Troubleshooting

### Variable Not Available

1. **Check the prefix**: Must be `VITE_` (not `NEXT_PUBLIC_` or anything else)
2. **Restart dev server**: Environment variables are loaded at startup
3. **Check file name**: Should be `.env.local` or `.env`
4. **Check location**: Must be in the project root directory

### Cross-Subdomain Issues

- Ensure `credentials: 'include'` is set in fetch options
- Check CORS settings on the server
- Verify both domains are using HTTPS in production
- Use the `fetchFromHub` utility function which handles this automatically

## Example: Complete Component

```typescript
import { useState, useEffect } from 'react';
import { fetchFromHub, getHubUrl } from '@/utils/env';

export function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchFromHub('/api/data');
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return <div>{/* Render data */}</div>;
}
```

