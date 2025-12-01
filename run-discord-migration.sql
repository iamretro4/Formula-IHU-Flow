-- Migration to add Discord support columns to tasks table
-- Run this in Supabase SQL Editor

ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_discord_user_id 
  ON public.tasks(discord_user_id);

COMMENT ON COLUMN public.tasks.content IS 'Task content from Discord slash command';
COMMENT ON COLUMN public.tasks.discord_user_id IS 'Discord user ID who created the task via Discord';

