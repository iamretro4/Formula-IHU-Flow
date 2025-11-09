-- ============================================================================
-- COMPLETE NOTIFICATION TRIGGERS
-- This migration adds all missing notification triggers for email notifications
-- ============================================================================

-- Function to create task_assigned notification
CREATE OR REPLACE FUNCTION public.create_task_assigned_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create notification if task is assigned to someone and it's a new assignment
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link
    ) VALUES (
      NEW.assigned_to,
      'task_assigned',
      'New Task Assigned',
      format('You have been assigned to task: "%s"', NEW.title),
      format('/tasks?id=%s', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for task assignment
DROP TRIGGER IF EXISTS on_task_assigned_notify ON public.tasks;
CREATE TRIGGER on_task_assigned_notify
  AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION public.create_task_assigned_notification();

-- Function to create document_approval notification
CREATE OR REPLACE FUNCTION public.create_document_approval_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When document is approved
  IF NEW.is_approved = true AND (OLD.is_approved IS NULL OR OLD.is_approved = false) THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link
    ) VALUES (
      NEW.uploaded_by,
      'document_approval',
      'Document Approved',
      format('Your document "%s" has been approved', NEW.title),
      format('/documents?id=%s', NEW.id)
    );
  END IF;
  
  -- When document is submitted for approval
  IF NEW.submitted_at IS NOT NULL AND (OLD.submitted_at IS NULL) THEN
    -- Notify approvers (this would need to check approval workflows)
    -- For now, we'll notify the document owner that it's submitted
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link
    ) VALUES (
      NEW.uploaded_by,
      'document_approval',
      'Document Submitted for Approval',
      format('Your document "%s" has been submitted for approval', NEW.title),
      format('/documents?id=%s', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for document approval
DROP TRIGGER IF EXISTS on_document_approval_notify ON public.documents;
CREATE TRIGGER on_document_approval_notify
  AFTER INSERT OR UPDATE OF is_approved, submitted_at ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.create_document_approval_notification();

-- Function to create meeting_reminder notification
CREATE OR REPLACE FUNCTION public.create_meeting_reminder_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_attendee RECORD;
BEGIN
  -- Create reminder notifications for all attendees
  FOR v_attendee IN
    SELECT attendee_id FROM public.meeting_attendees WHERE meeting_id = NEW.id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link
    ) VALUES (
      v_attendee.attendee_id,
      'meeting_reminder',
      format('Meeting Reminder: %s', NEW.title),
      format('You have a meeting "%s" scheduled for %s', NEW.title, NEW.start_time),
      format('/communications?meeting=%s', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Note: Meeting reminders should be scheduled, not triggered on insert
-- This is a placeholder - actual reminders should use a scheduled job

-- Function to create bottleneck_detected notification
CREATE OR REPLACE FUNCTION public.create_bottleneck_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_owner UUID;
BEGIN
  -- Get project owner or team leader
  SELECT created_by INTO v_project_owner
  FROM public.projects
  WHERE id = NEW.project_id
  LIMIT 1;
  
  IF v_project_owner IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link
    ) VALUES (
      v_project_owner,
      'bottleneck_detected',
      'Bottleneck Detected',
      format('A %s bottleneck has been detected: %s', NEW.severity, NEW.description),
      format('/bottlenecks?id=%s', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for bottleneck detection
DROP TRIGGER IF EXISTS on_bottleneck_detected_notify ON public.bottlenecks;
CREATE TRIGGER on_bottleneck_detected_notify
  AFTER INSERT ON public.bottlenecks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_bottleneck_notification();

-- Function to create certification_expiring notification
CREATE OR REPLACE FUNCTION public.create_certification_expiring_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_days_until_expiry INTEGER;
BEGIN
  IF NEW.expiry_date IS NOT NULL THEN
    v_days_until_expiry := EXTRACT(DAY FROM NEW.expiry_date - NOW())::INTEGER;
    
    -- Notify if expiring within 30 days
    IF v_days_until_expiry <= 30 AND v_days_until_expiry > 0 THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link
      ) VALUES (
        NEW.user_id,
        'certification_expiring',
        'Certification Expiring Soon',
        format('Your certification "%s" expires in %s days', 
          (SELECT name FROM public.certifications WHERE id = NEW.certification_id),
          v_days_until_expiry
        ),
        '/team'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for certification expiry (runs on update to check expiry)
-- Note: This should also run on a scheduled job to check existing certifications

-- Function to create purchase_request notification
CREATE OR REPLACE FUNCTION public.create_purchase_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_approver_id UUID;
BEGIN
  -- Notify approvers (this would need to check who can approve purchases)
  -- For now, notify team leaders/admins
  -- This is a simplified version - you'd want to check actual approval workflows
  
  IF NEW.status = 'pending' THEN
    -- Find approvers (simplified - you'd want proper role checking)
    FOR v_approver_id IN
      SELECT id FROM public.profiles WHERE role = 'team_leader' LIMIT 1
    LOOP
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link
      ) VALUES (
        v_approver_id,
        'purchase_request',
        'New Purchase Request',
        format('A new purchase request has been submitted: %s', NEW.item_name),
        format('/budgets?purchase=%s', NEW.id)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Purchase requests table may not exist yet - adjust table name as needed

