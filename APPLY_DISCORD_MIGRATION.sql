-- Apply Discord Support Migration
-- Run this in Supabase Dashboard → SQL Editor

-- Add content column if it doesn't exist
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Add discord_user_id column to track which Discord user created the task
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

-- Create index on discord_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_discord_user_id 
  ON public.tasks(discord_user_id);

-- Add comments for documentation
COMMENT ON COLUMN public.tasks.content IS 'Task content from Discord slash command';
COMMENT ON COLUMN public.tasks.discord_user_id IS 'Discord user ID who created the task via Discord';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tasks' 
  AND column_name IN ('content', 'discord_user_id');

