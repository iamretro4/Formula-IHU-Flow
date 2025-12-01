-- Migration to add Discord support columns to tasks table
-- This adds the 'content' and 'discord_user_id' columns as specified

-- Add content column if it doesn't exist (alternative to title/description)
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Add discord_user_id column to track which Discord user created the task
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

-- Create index on discord_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_discord_user_id 
  ON public.tasks(discord_user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.content IS 'Task content from Discord slash command';
COMMENT ON COLUMN public.tasks.discord_user_id IS 'Discord user ID who created the task via Discord';

