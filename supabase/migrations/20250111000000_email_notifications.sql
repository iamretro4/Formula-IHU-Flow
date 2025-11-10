-- ============================================================================
-- EMAIL NOTIFICATIONS SYSTEM
-- ============================================================================

-- Create email queue table for reliable email delivery
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  from_email TEXT DEFAULT 'noreply@fihu.gr',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL
);

-- Create email preferences table
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  task_assigned BOOLEAN DEFAULT true,
  document_approval BOOLEAN DEFAULT true,
  deadline_alert BOOLEAN DEFAULT true,
  purchase_request BOOLEAN DEFAULT true,
  bottleneck_detected BOOLEAN DEFAULT true,
  certification_expiring BOOLEAN DEFAULT true,
  meeting_reminder BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "All authenticated users are admins - full access to email_queue" ON public.email_queue;
DROP POLICY IF EXISTS "Users can view their own email preferences" ON public.email_preferences;
DROP POLICY IF EXISTS "Users can update their own email preferences" ON public.email_preferences;
DROP POLICY IF EXISTS "All authenticated users can insert email preferences" ON public.email_preferences;

CREATE POLICY "All authenticated users are admins - full access to email_queue"
  ON public.email_queue FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own email preferences"
  ON public.email_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own email preferences"
  ON public.email_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "All authenticated users can insert email preferences"
  ON public.email_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to send email via Edge Function
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

-- Function to send notification email
CREATE OR REPLACE FUNCTION public.send_notification_email(
  p_notification_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification RECORD;
  v_user_email TEXT;
  v_user_preferences RECORD;
  v_email_enabled BOOLEAN;
  v_type_enabled BOOLEAN;
  v_html_content TEXT;
  v_subject TEXT;
BEGIN
  -- Get notification details
  SELECT * INTO v_notification
  FROM public.notifications
  WHERE id = p_notification_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM public.profiles
  WHERE id = v_notification.user_id;

  IF v_user_email IS NULL THEN
    RETURN;
  END IF;

  -- Get user email preferences
  SELECT * INTO v_user_preferences
  FROM public.email_preferences
  WHERE user_id = v_notification.user_id;

  -- Check if email is enabled
  IF v_user_preferences IS NULL THEN
    -- Default: email enabled
    v_email_enabled := true;
    v_type_enabled := true;
  ELSE
    v_email_enabled := v_user_preferences.email_enabled;
    
    -- Check type-specific preference
    CASE v_notification.type
      WHEN 'task_assigned' THEN
        v_type_enabled := v_user_preferences.task_assigned;
      WHEN 'document_approval' THEN
        v_type_enabled := v_user_preferences.document_approval;
      WHEN 'deadline_alert' THEN
        v_type_enabled := v_user_preferences.deadline_alert;
      WHEN 'purchase_request' THEN
        v_type_enabled := v_user_preferences.purchase_request;
      WHEN 'bottleneck_detected' THEN
        v_type_enabled := v_user_preferences.bottleneck_detected;
      WHEN 'certification_expiring' THEN
        v_type_enabled := v_user_preferences.certification_expiring;
      WHEN 'meeting_reminder' THEN
        v_type_enabled := v_user_preferences.meeting_reminder;
      ELSE
        v_type_enabled := true;
    END CASE;
  END IF;

  -- If email is disabled, return
  IF NOT v_email_enabled OR NOT v_type_enabled THEN
    RETURN;
  END IF;

  -- Generate email content
  v_subject := v_notification.title;
  v_html_content := format('
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Formula IHU Preparation Hub</h1>
        </div>
        <div class="content">
          <h2>%s</h2>
          <p>%s</p>
          %s
        </div>
        <div class="footer">
          <p>This is an automated notification from Formula IHU Preparation Hub.</p>
          <p>You can manage your email preferences in the application settings.</p>
        </div>
      </div>
    </body>
    </html>
  ',
    v_notification.title,
    v_notification.message,
    CASE 
      WHEN v_notification.link IS NOT NULL THEN
        format('<a href="%s" class="button">View Details</a>', v_notification.link)
      ELSE ''
    END
  );

  -- Queue the email
  INSERT INTO public.email_queue (
    to_email,
    subject,
    html_content,
    notification_id
  ) VALUES (
    v_user_email,
    v_subject,
    v_html_content,
    p_notification_id
  );
END;
$$;

-- Trigger to send email when notification is created
CREATE OR REPLACE FUNCTION public.trigger_send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Queue email for sending
  PERFORM public.send_notification_email(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_notification_created_send_email ON public.notifications;
CREATE TRIGGER on_notification_created_send_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_notification_email();

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_email_preferences ON public.email_preferences;
CREATE TRIGGER set_updated_at_email_preferences BEFORE UPDATE ON public.email_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

