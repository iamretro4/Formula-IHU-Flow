-- Apply All Discord Integration Migrations
-- Run this in Supabase Dashboard → SQL Editor

-- Migration 1: Add Discord support columns to tasks table
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_discord_user_id 
  ON public.tasks(discord_user_id);

COMMENT ON COLUMN public.tasks.content IS 'Task content from Discord slash command';
COMMENT ON COLUMN public.tasks.discord_user_id IS 'Discord user ID who created the task via Discord';

-- Migration 2: Add Discord user linking to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS discord_link_code TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_discord_user_id 
  ON public.profiles(discord_user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_discord_link_code 
  ON public.profiles(discord_link_code);

COMMENT ON COLUMN public.profiles.discord_user_id IS 'Discord user ID for linking accounts';
COMMENT ON COLUMN public.profiles.discord_link_code IS 'Temporary code for linking Discord account (expires after use)';

-- Migration 2.5: Add Discord role column to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS discord_role TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_discord_role 
  ON public.profiles(discord_role);

COMMENT ON COLUMN public.profiles.discord_role IS 'Discord team role assigned to the user (e.g., role_team_a, role_team_b)';

-- Migration 3: Enable http extension for Discord notifications
CREATE EXTENSION IF NOT EXISTS http;

-- Migration 4: Create Discord notification function
CREATE OR REPLACE FUNCTION public.notify_discord_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_type TEXT;
  assigned_user_id UUID;
  created_user_id UUID;
  service_role_key TEXT;
BEGIN
  -- Get service role key from settings
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type := 'created';
    created_user_id := NEW.created_by;
    assigned_user_id := NEW.assigned_to;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if status changed to completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
      event_type := 'completed';
      created_user_id := NEW.created_by;
      assigned_user_id := NEW.assigned_to;
    -- Check if assigned_to changed
    ELSIF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
      event_type := 'assigned';
      assigned_user_id := NEW.assigned_to;
      created_user_id := NEW.created_by;
    ELSE
      event_type := 'updated';
      created_user_id := NEW.created_by;
      assigned_user_id := NEW.assigned_to;
    END IF;
  END IF;
  
  -- Notify creator if task was created
  IF event_type = 'created' AND created_user_id IS NOT NULL THEN
    PERFORM http_post(
      url := 'https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'taskId', NEW.id,
        'eventType', event_type,
        'userId', created_user_id
      )
    );
  END IF;
  
  -- Notify assignee if task was assigned
  IF event_type = 'assigned' AND assigned_user_id IS NOT NULL THEN
    PERFORM http_post(
      url := 'https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'taskId', NEW.id,
        'eventType', event_type,
        'userId', assigned_user_id
      )
    );
  END IF;
  
  -- Notify on completion
  IF event_type = 'completed' THEN
    -- Notify creator
    IF created_user_id IS NOT NULL THEN
      PERFORM http_post(
        url := 'https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'taskId', NEW.id,
          'eventType', event_type,
          'userId', created_user_id
        )
      );
    END IF;
    
    -- Notify assignee if different from creator
    IF assigned_user_id IS NOT NULL AND assigned_user_id != created_user_id THEN
      PERFORM http_post(
        url := 'https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'taskId', NEW.id,
          'eventType', event_type,
          'userId', assigned_user_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in notify_discord_task_change: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Migration 5: Create trigger for Discord notifications
DROP TRIGGER IF EXISTS on_task_change_discord_notify ON public.tasks;

CREATE TRIGGER on_task_change_discord_notify
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_discord_task_change();

-- Verify migrations
SELECT 
  'Tasks table columns' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name IN ('content', 'discord_user_id')
    ) THEN '✅ Added'
    ELSE '❌ Missing'
  END as status
UNION ALL
SELECT 
  'Profiles table columns',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name IN ('discord_user_id', 'discord_link_code')
    ) THEN '✅ Added'
    ELSE '❌ Missing'
  END
UNION ALL
SELECT 
  'Discord notification trigger',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_task_change_discord_notify'
    ) THEN '✅ Created'
    ELSE '❌ Missing'
  END;

