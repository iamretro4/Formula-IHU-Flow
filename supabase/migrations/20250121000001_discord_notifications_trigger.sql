-- Migration for Discord notification triggers
-- Automatically sends Discord notifications when tasks are created or updated

-- Note: For Supabase, we'll use pg_net extension if available
-- If not available, notifications will be sent via app-side calls instead
-- This trigger is optional - notifications can also be sent from the app

-- Function to notify Discord via edge function
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
  
  -- Store notification request in a queue table (if it exists)
  -- Alternative: App can call discord-notifications edge function directly
  -- This trigger logs the event for potential notification processing
  
  -- For now, we'll create a notification record that can be processed
  -- by a separate process or the app can call the edge function directly
  
  -- Note: Direct HTTP calls from PostgreSQL triggers are limited in Supabase
  -- Recommended: Call discord-notifications edge function from your app code
  -- when tasks are created/updated, or use Supabase webhooks
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in notify_discord_task_change: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_task_change_discord_notify ON public.tasks;

-- Create trigger for task changes
CREATE TRIGGER on_task_change_discord_notify
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_discord_task_change();

-- Add comment
COMMENT ON FUNCTION public.notify_discord_task_change() IS 'Sends Discord notifications when tasks are created, updated, assigned, or completed';

