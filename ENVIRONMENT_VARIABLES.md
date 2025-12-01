# Environment Variables Configuration

## ✅ Current Configuration

All environment variables have been configured and converted from Next.js format to Vite format.

### File Location
- `.env.local` - Contains all production environment variables (not committed to git)

## Environment Variables

### Supabase Configuration
```env
VITE_SUPABASE_URL=https://hirifbecooazbevauffq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Domain Configuration
```env
VITE_BASE_URL=https://flow.fihu.gr
VITE_DOMAIN=flow.fihu.gr
```

### API Endpoints
```env
VITE_API_URL=https://flow.fihu.gr/api
VITE_MAIN_URL=https://fihu.gr
VITE_HUB_URL=https://hub.fihu.gr
```

### CORS Configuration
```env
VITE_ALLOWED_ORIGINS=https://fihu.gr,https://hub.fihu.gr,https://flow.fihu.gr
```

## Usage Examples

### Method 1: Direct Access
```typescript
// Get environment variables directly
const baseUrl = import.meta.env.VITE_BASE_URL;
const hubUrl = import.meta.env.VITE_HUB_URL;
const apiUrl = import.meta.env.VITE_API_URL;
const mainUrl = import.meta.env.VITE_MAIN_URL;
const domain = import.meta.env.VITE_DOMAIN;
```

### Method 2: Using Utility Functions (Recommended)
```typescript
import { 
  getBaseUrl, 
  getHubUrl, 
  getApiUrl, 
  getMainUrl, 
  getDomain,
  getAllowedOrigins,
  fetchFromHub,
  fetchFromApi,
  fetchFromMain,
  fetchFromBase
} from '@/utils/env';

// Get URLs
const baseUrl = getBaseUrl();        // https://flow.fihu.gr
const hubUrl = getHubUrl();          // https://hub.fihu.gr
const apiUrl = getApiUrl();          // https://flow.fihu.gr/api
const mainUrl = getMainUrl();        // https://fihu.gr
const domain = getDomain();          // flow.fihu.gr
const origins = getAllowedOrigins(); // ['https://fihu.gr', 'https://hub.fihu.gr', 'https://flow.fihu.gr']
```

### Method 3: Making API Requests

#### Fetch from Hub (Cross-Subdomain)
```typescript
import { fetchFromHub } from '@/utils/env';

const fetchHubData = async () => {
  const response = await fetchFromHub('/api/data', {
    method: 'GET',
  });
  return response.json();
};
```

#### Fetch from API Endpoint
```typescript
import { fetchFromApi } from '@/utils/env';

const fetchApiData = async () => {
  const response = await fetchFromApi('/data', {
    method: 'POST',
    body: JSON.stringify({ key: 'value' }),
  });
  return response.json();
};
```

#### Fetch from Main Domain
```typescript
import { fetchFromMain } from '@/utils/env';

const fetchMainData = async () => {
  const response = await fetchFromMain('/api/data', {
    method: 'GET',
  });
  return response.json();
};
```

## Complete Example Component

```typescript
import { useState, useEffect } from 'react';
import { 
  getBaseUrl, 
  getHubUrl, 
  getApiUrl,
  fetchFromHub,
  fetchFromApi 
} from '@/utils/env';

export function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Example 1: Fetch from hub
        const hubResponse = await fetchFromHub('/api/hub-data');
        const hubData = await hubResponse.json();
        
        // Example 2: Fetch from API
        const apiResponse = await fetchFromApi('/data');
        const apiData = await apiResponse.json();
        
        setData({ hub: hubData, api: apiData });
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Display URLs for debugging
  console.log('Base URL:', getBaseUrl());
  console.log('Hub URL:', getHubUrl());
  console.log('API URL:', getApiUrl());

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return <div>{/* Render data */}</div>;
}
```

## Variable Conversion Reference

| Next.js Format | Vite Format | Description |
|----------------|-------------|-------------|
| `NEXT_PUBLIC_BASE_URL` | `VITE_BASE_URL` | Base URL for the application |
| `NEXT_PUBLIC_DOMAIN` | `VITE_DOMAIN` | Domain name |
| `NEXT_PUBLIC_API_URL` | `VITE_API_URL` | API endpoint URL |
| `NEXT_PUBLIC_MAIN_URL` | `VITE_MAIN_URL` | Main application URL |
| `NEXT_PUBLIC_HUB_URL` | `VITE_HUB_URL` | Hub subdomain URL |
| `ALLOWED_ORIGINS` | `VITE_ALLOWED_ORIGINS` | CORS allowed origins |

## Important Notes

1. **Vite Prefix**: All client-side environment variables must be prefixed with `VITE_`
2. **Access Method**: Use `import.meta.env.VITE_*` (not `process.env`)
3. **Type Safety**: TypeScript definitions are in `src/vite-env.d.ts`
4. **Security**: `.env.local` is in `.gitignore` and should never be committed
5. **Restart Required**: Restart the dev server after changing environment variables

## Production Deployment

When deploying to production (Vercel, Netlify, etc.), set these environment variables in your hosting platform's dashboard:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_BASE_URL`
- `VITE_DOMAIN`
- `VITE_API_URL`
- `VITE_MAIN_URL`
- `VITE_HUB_URL`
- `VITE_ALLOWED_ORIGINS`

## Troubleshooting

### Variable Not Available
1. Check the prefix is `VITE_` (not `NEXT_PUBLIC_`)
2. Restart the dev server
3. Check the file is named `.env.local` and in the root directory
4. Verify the variable name matches exactly (case-sensitive)

### Cross-Subdomain Issues
- Ensure `credentials: 'include'` is set (handled automatically by utility functions)
- Check CORS settings on the server
- Verify both domains use HTTPS in production
- Use the provided utility functions which handle this automatically

