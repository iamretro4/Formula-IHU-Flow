/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_BASE_URL?: string;
  readonly VITE_DOMAIN?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_MAIN_URL?: string;
  readonly VITE_HUB_URL?: string;
  readonly VITE_ALLOWED_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}