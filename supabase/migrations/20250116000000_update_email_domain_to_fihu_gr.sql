-- ============================================================================
-- UPDATE EMAIL DOMAIN TO FIHU.GR
-- ============================================================================
-- This migration updates the default email domain from ihuflow.com to fihu.gr

-- Update default value for email_queue.from_email column
ALTER TABLE IF EXISTS public.email_queue 
  ALTER COLUMN from_email SET DEFAULT 'noreply@fihu.gr';

-- Update the function default parameter
CREATE OR REPLACE FUNCTION public.send_email_via_edge_function(
  p_to_email TEXT,
  p_subject TEXT,
  p_html_content TEXT,
  p_from_email TEXT DEFAULT 'noreply@fihu.gr'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_response JSONB;
BEGIN
  -- Queue the email instead of sending directly
  -- The Edge Function will be called by a scheduled job or webhook
  INSERT INTO public.email_queue (
    to_email,
    subject,
    html_content,
    from_email
  ) VALUES (
    p_to_email,
    p_subject,
    p_html_content,
    p_from_email
  );
END;
$$;

