-- Migration for Discord role assignment
-- Adds discord_role column to profiles table to track Discord team roles

-- Add discord_role column to profiles if it doesn't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS discord_role TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_discord_role 
  ON public.profiles(discord_role);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.discord_role IS 'Discord team role assigned to the user (e.g., role_team_a, role_team_b)';

