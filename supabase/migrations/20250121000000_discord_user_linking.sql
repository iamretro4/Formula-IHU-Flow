-- Migration for Discord user linking
-- Adds discord_user_id and discord_link_code to profiles table

-- Add discord_user_id column to profiles if it doesn't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

-- Add discord_link_code column for temporary linking codes
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS discord_link_code TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_discord_user_id 
  ON public.profiles(discord_user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_discord_link_code 
  ON public.profiles(discord_link_code);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.discord_user_id IS 'Discord user ID for linking accounts';
COMMENT ON COLUMN public.profiles.discord_link_code IS 'Temporary code for linking Discord account (expires after use)';

