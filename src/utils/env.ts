/**
 * Environment variable utilities for Vite
 * 
 * In Vite, environment variables must be prefixed with VITE_ to be exposed to the client.
 * Access them using: import.meta.env.VITE_*
 * 
 * Example usage:
 * ```typescript
 * import { getBaseUrl, getHubUrl } from '@/utils/env';
 * 
 * const baseUrl = getBaseUrl();
 * const hubUrl = getHubUrl();
 * ```
 */

/**
 * Get the base URL for the main application
 * Falls back to window.location.origin if not set
 */
export const getBaseUrl = (): string => {
  return import.meta.env.VITE_BASE_URL || 
         (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
};

/**
 * Get the hub URL for cross-subdomain requests
 * Falls back to base URL if not set
 */
export const getHubUrl = (): string => {
  return import.meta.env.VITE_HUB_URL || getBaseUrl();
};

/**
 * Get the main application URL (different from base URL)
 * Falls back to base URL if not set
 */
export const getMainUrl = (): string => {
  return import.meta.env.VITE_MAIN_URL || getBaseUrl();
};

/**
 * Get the API URL endpoint
 * Falls back to base URL + /api if not set
 */
export const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || `${getBaseUrl()}/api`;
};

/**
 * Get the domain name
 * Falls back to extracting from base URL if not set
 */
export const getDomain = (): string => {
  if (import.meta.env.VITE_DOMAIN) {
    return import.meta.env.VITE_DOMAIN;
  }
  const baseUrl = getBaseUrl();
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return baseUrl;
  }
};

/**
 * Get allowed origins for CORS (comma-separated)
 * Returns array of allowed origins
 */
export const getAllowedOrigins = (): string[] => {
  const origins = import.meta.env.VITE_ALLOWED_ORIGINS;
  if (!origins) {
    // Default to current domain and common subdomains
    const domain = getDomain();
    return [
      `https://${domain}`,
      `https://www.${domain}`,
      `https://hub.${domain}`,
      `https://flow.${domain}`,
    ];
  }
  return origins.split(',').map(origin => origin.trim());
};

/**
 * Get the Supabase URL
 */
export const getSupabaseUrl = (): string => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    throw new Error('VITE_SUPABASE_URL is not set in environment variables');
  }
  return url;
};

/**
 * Get the Supabase publishable key
 */
export const getSupabaseKey = (): string => {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY is not set in environment variables');
  }
  return key;
};

/**
 * Make a fetch request to the hub URL with proper credentials for cross-subdomain requests
 * 
 * @param endpoint - The API endpoint (e.g., '/api/data')
 * @param options - Fetch options (credentials: 'include' is automatically added)
 * @returns Promise<Response>
 * 
 * @example
 * ```typescript
 * const data = await fetchFromHub('/api/data', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * });
 * const json = await data.json();
 * ```
 */
export const fetchFromHub = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const hubUrl = getHubUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${hubUrl}${endpoint}`;
  
  return fetch(url, {
    ...options,
    credentials: 'include', // Important for cross-subdomain cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

/**
 * Make a fetch request to the base URL
 * 
 * @param endpoint - The API endpoint (e.g., '/api/data')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const fetchFromBase = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const baseUrl = getBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

/**
 * Make a fetch request to the API URL
 * 
 * @param endpoint - The API endpoint (e.g., '/data' - will be prefixed with /api)
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const fetchFromApi = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const apiUrl = getApiUrl();
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : endpoint.startsWith('/') 
      ? `${apiUrl}${endpoint}` 
      : `${apiUrl}/${endpoint}`;
  
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

/**
 * Make a fetch request to the main URL
 * 
 * @param endpoint - The API endpoint (e.g., '/data')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const fetchFromMain = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const mainUrl = getMainUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${mainUrl}${endpoint}`;
  
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

