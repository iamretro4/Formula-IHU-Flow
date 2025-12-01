-- ============================================================================
-- SETUP SCHEDULED JOB FOR EMAIL QUEUE PROCESSING
-- ============================================================================
-- This migration sets up a cron job to automatically process the email queue
-- The job runs every 5 minutes to send queued emails
--
-- IMPORTANT: pg_cron may not be available on all Supabase plans.
-- If this migration fails, use an external cron service instead.
-- See SETUP_EMAIL_QUEUE_CRON.md for alternative methods.

-- Enable pg_cron extension (if available)
-- Note: This requires superuser privileges and may not be available on all plans
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available. Use external cron service instead.';
    RAISE NOTICE 'See SETUP_EMAIL_QUEUE_CRON.md for alternative setup methods.';
END $$;

-- Only proceed if pg_cron is available
-- Note: This approach requires the net extension for HTTP requests
-- If net extension is not available, use an external cron service instead

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule existing job if it exists
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
      PERFORM cron.unschedule('process-email-queue');
    END IF;

    -- Note: Cannot schedule HTTP calls from PostgreSQL on Supabase (net extension not available)
    -- You MUST use an external cron service instead (see QUICK_SETUP_EMAIL_CRON.md)
    -- 
    -- The cron job should call the Edge Function directly:
    -- https://hirifbecooazbevauffq.supabase.co/functions/v1/process-email-queue
    --
    -- This migration does NOT create a working cron job.
    -- Please use cron-job.org or another external service.
    
    RAISE NOTICE 'pg_cron is available, but HTTP calls from PostgreSQL are not supported on Supabase.';
    RAISE NOTICE 'Please use an external cron service. See QUICK_SETUP_EMAIL_CRON.md for instructions.';
  ELSE
    RAISE NOTICE 'pg_cron not available. Please use external cron service (see SETUP_EMAIL_QUEUE_CRON.md)';
  END IF;
END $$;

-- NOTE: The net extension is NOT available on Supabase, so we cannot call HTTP from PostgreSQL.
-- This migration will set up the structure, but you MUST use an external cron service.
-- 
-- RECOMMENDED: Use cron-job.org (free, easy setup)
-- See QUICK_SETUP_EMAIL_CRON.md for step-by-step instructions
--
-- The cron job should call:
-- URL: https://hirifbecooazbevauffq.supabase.co/functions/v1/process-email-queue
-- Method: POST
-- Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--          Content-Type: application/json
-- Body: {}
-- Schedule: */5 * * * * (every 5 minutes)

-- Since we can't use HTTP from PostgreSQL, we'll create a simple function
-- that processes emails directly (as a fallback, though Edge Function is preferred)
CREATE OR REPLACE FUNCTION public.process_email_queue_direct()
RETURNS TABLE(processed INTEGER, failed INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email RECORD;
  v_processed INTEGER := 0;
  v_failed INTEGER := 0;
  v_resend_api_key TEXT;
  v_response JSONB;
  v_http_response TEXT;
BEGIN
  -- Get Resend API key from environment (set in Supabase Edge Functions secrets)
  -- Note: This won't work directly - you need to use the Edge Function instead
  -- This is just a placeholder to show the structure
  
  RAISE NOTICE 'Direct email processing is not recommended. Use the Edge Function via external cron instead.';
  RAISE NOTICE 'See QUICK_SETUP_EMAIL_CRON.md for setup instructions.';
  
  -- Return empty results - actual processing should be done via Edge Function
  RETURN QUERY SELECT 0::INTEGER, 0::INTEGER;
END;
$$;

-- To view scheduled jobs:
-- SELECT * FROM cron.job WHERE jobname = 'process-email-queue';

-- To view job execution history:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-email-queue') ORDER BY start_time DESC LIMIT 10;

-- To unschedule the job:
-- SELECT cron.unschedule('process-email-queue');

-- To update the schedule:
-- SELECT cron.unschedule('process-email-queue');
-- Then run the schedule command again with new cron expression

