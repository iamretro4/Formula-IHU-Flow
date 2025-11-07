-- ============================================================================
-- COMPREHENSIVE FEATURES MIGRATION
-- Automated Approval Workflows, Budget Tracking, Communications, and More
-- ============================================================================

-- ============================================================================
-- 1. APPROVAL WORKFLOWS
-- ============================================================================

-- Create approval workflow status enum
-- Drop if exists to allow re-running migration (CASCADE will drop dependent objects)
DROP TYPE IF EXISTS public.approval_status CASCADE;

CREATE TYPE public.approval_status AS ENUM ('draft', 'pending', 'submitted', 'in_review', 'approved', 'rejected', 'revision_requested');

-- Create approval workflow steps table
CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('eso_qualification', 'business_plan_video', 'technical_report', 'standard')),
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 1,
  status public.approval_status DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create approval steps table
CREATE TABLE IF NOT EXISTS public.approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.approval_workflows(id) ON DELETE CASCADE NOT NULL,
  step_number INTEGER NOT NULL,
  approver_role TEXT, -- e.g., 'director', 'chief', 'team_leader'
  approver_id UUID REFERENCES public.profiles(id),
  status public.approval_status DEFAULT 'pending',
  comments TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, step_number)
);

-- ============================================================================
-- 2. SKILL-BASED TASK RECOMMENDATIONS & CERTIFICATIONS
-- ============================================================================

-- Create certifications table
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('safety', 'technical', 'inspection', 'other')),
  required_for_tasks TEXT[], -- Array of task types that require this certification
  validity_days INTEGER, -- How long certification is valid
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user certifications table
CREATE TABLE IF NOT EXISTS public.user_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  certification_id UUID REFERENCES public.certifications(id) ON DELETE CASCADE NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  issued_by UUID REFERENCES public.profiles(id),
  certificate_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, certification_id)
);

-- Create task certification requirements table
CREATE TABLE IF NOT EXISTS public.task_certification_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  certification_id UUID REFERENCES public.certifications(id) ON DELETE CASCADE NOT NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, certification_id)
);

-- ============================================================================
-- 3. BOTTLENECK DETECTION
-- ============================================================================

-- Create bottleneck detection table
CREATE TABLE IF NOT EXISTS public.bottlenecks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('dependency', 'resource', 'deadline', 'skill_gap', 'approval')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_suggestion TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. DOCUMENT & COMPLIANCE HUB ENHANCEMENTS
-- ============================================================================

-- Add version control fields to documents (if not already present)
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES public.documents(id),
  ADD COLUMN IF NOT EXISTS change_log TEXT,
  ADD COLUMN IF NOT EXISTS fsg_submission_id TEXT, -- FSG platform integration
  ADD COLUMN IF NOT EXISTS fsg_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_reason TEXT,
  ADD COLUMN IF NOT EXISTS late_submission_days INTEGER DEFAULT 0;

-- Create document deadline alerts table
CREATE TABLE IF NOT EXISTS public.document_deadline_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  alert_days_before INTEGER NOT NULL, -- Days before deadline to send alert
  sent_at TIMESTAMPTZ,
  alert_type TEXT DEFAULT 'email' CHECK (alert_type IN ('email', 'notification', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. FINANCIAL PREPARATION & BUDGET TRACKING
-- ============================================================================

-- Create budget phases enum
CREATE TYPE public.budget_phase AS ENUM ('planning', 'design', 'manufacturing', 'testing', 'competition', 'post_competition');

-- Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phase public.budget_phase NOT NULL,
  allocated_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  spent_amount DECIMAL(12, 2) DEFAULT 0,
  forecasted_amount DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expense categories enum
CREATE TYPE public.expense_category AS ENUM (
  'materials', 'manufacturing', 'tools', 'software', 'competition_fees', 
  'travel', 'accommodation', 'food', 'marketing', 'sponsorship', 'other'
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category public.expense_category NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  expense_date DATE NOT NULL,
  vendor TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase requests table
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  category public.expense_category NOT NULL,
  vendor TEXT,
  justification TEXT,
  requested_by UUID REFERENCES public.profiles(id) NOT NULL,
  approval_threshold DECIMAL(12, 2) DEFAULT 0, -- Amount threshold for approval
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase request approvals table (for multi-level approvals)
CREATE TABLE IF NOT EXISTS public.purchase_request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id UUID REFERENCES public.purchase_requests(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES public.profiles(id) NOT NULL,
  approval_level INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. ADVANCED COMMUNICATION & COLLABORATION
-- ============================================================================

-- Create communication channels table
CREATE TABLE IF NOT EXISTS public.communication_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department public.department,
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create channel members table
CREATE TABLE IF NOT EXISTS public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.communication_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.communication_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.messages(id),
  attachments TEXT[], -- Array of file URLs
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification types enum
CREATE TYPE public.notification_type AS ENUM (
  'deadline_alert', 'task_assigned', 'document_approval', 'purchase_request', 
  'bottleneck_detected', 'certification_expiring', 'meeting_reminder', 'other'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to related resource
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meetings/events table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  video_conference_url TEXT,
  organizer_id UUID REFERENCES public.profiles(id) NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  channel_id UUID REFERENCES public.communication_channels(id),
  meeting_type TEXT DEFAULT 'meeting' CHECK (meeting_type IN ('meeting', 'briefing', 'training', 'review', 'other')),
  calendar_event_id TEXT, -- For external calendar sync
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meeting attendees table
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'tentative')),
  responded_at TIMESTAMPTZ,
  UNIQUE(meeting_id, user_id)
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_certification_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottlenecks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_deadline_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (All authenticated users are admins)
-- ============================================================================

-- Approval workflows
CREATE POLICY "All authenticated users are admins - full access to approval_workflows"
  ON public.approval_workflows FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to approval_steps"
  ON public.approval_steps FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Certifications
CREATE POLICY "All authenticated users are admins - full access to certifications"
  ON public.certifications FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to user_certifications"
  ON public.user_certifications FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to task_certification_requirements"
  ON public.task_certification_requirements FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Bottlenecks
CREATE POLICY "All authenticated users are admins - full access to bottlenecks"
  ON public.bottlenecks FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Document deadline alerts
CREATE POLICY "All authenticated users are admins - full access to document_deadline_alerts"
  ON public.document_deadline_alerts FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Budgets
CREATE POLICY "All authenticated users are admins - full access to budgets"
  ON public.budgets FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to expenses"
  ON public.expenses FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to purchase_requests"
  ON public.purchase_requests FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to purchase_request_approvals"
  ON public.purchase_request_approvals FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Communication
CREATE POLICY "All authenticated users are admins - full access to communication_channels"
  ON public.communication_channels FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to channel_members"
  ON public.channel_members FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to meetings"
  ON public.meetings FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to meeting_attendees"
  ON public.meeting_attendees FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER set_updated_at_approval_workflows BEFORE UPDATE ON public.approval_workflows FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_approval_steps BEFORE UPDATE ON public.approval_steps FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_budgets BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_purchase_requests BEFORE UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_communication_channels BEFORE UPDATE ON public.communication_channels FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_messages BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_meetings BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- FUNCTIONS FOR AUTOMATION
-- ============================================================================

-- Function to detect bottlenecks
CREATE OR REPLACE FUNCTION public.detect_bottlenecks()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  task_record RECORD;
  dep_task RECORD;
  days_overdue INTEGER;
BEGIN
  -- Detect overdue tasks
  FOR task_record IN 
    SELECT * FROM public.tasks 
    WHERE status != 'completed' 
    AND due_date IS NOT NULL 
    AND due_date < NOW()
  LOOP
    days_overdue := EXTRACT(DAY FROM NOW() - task_record.due_date);
    
    INSERT INTO public.bottlenecks (
      task_id,
      project_id,
      type,
      severity,
      description,
      resolution_suggestion
    ) VALUES (
      task_record.id,
      task_record.project_id,
      'deadline',
      CASE 
        WHEN days_overdue > 7 THEN 'critical'
        WHEN days_overdue > 3 THEN 'high'
        ELSE 'medium'
      END,
      'Task "' || task_record.title || '" is ' || days_overdue || ' days overdue',
      'Review task priority and assign additional resources if needed'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Detect blocked tasks with incomplete dependencies
  FOR task_record IN 
    SELECT * FROM public.tasks 
    WHERE status = 'blocked' 
    AND dependencies IS NOT NULL
  LOOP
    FOR dep_task IN 
      SELECT * FROM public.tasks 
      WHERE id = ANY(task_record.dependencies) 
      AND status != 'completed'
    LOOP
      INSERT INTO public.bottlenecks (
        task_id,
        project_id,
        type,
        severity,
        description,
        resolution_suggestion
      ) VALUES (
        task_record.id,
        task_record.project_id,
        'dependency',
        'high',
        'Task "' || task_record.title || '" is blocked by incomplete dependency: "' || dep_task.title || '"',
        'Prioritize completion of dependency task or reassess task dependencies'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Function to check certification requirements for tasks
CREATE OR REPLACE FUNCTION public.check_task_certifications(p_task_id UUID)
RETURNS TABLE(
  user_id UUID,
  missing_certifications TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH required_certs AS (
    SELECT certification_id 
    FROM public.task_certification_requirements 
    WHERE task_id = p_task_id AND is_required = true
  ),
  task_user AS (
    SELECT assigned_to 
    FROM public.tasks 
    WHERE id = p_task_id
  ),
  user_certs AS (
    SELECT 
      uc.user_id,
      uc.certification_id,
      uc.expires_at,
      uc.is_active
    FROM public.user_certifications uc
    WHERE uc.user_id = (SELECT assigned_to FROM task_user)
    AND uc.is_active = true
    AND (uc.expires_at IS NULL OR uc.expires_at > NOW())
  )
  SELECT 
    tu.assigned_to as user_id,
    ARRAY_AGG(c.name) FILTER (WHERE uc.certification_id IS NULL) as missing_certifications
  FROM task_user tu
  CROSS JOIN required_certs rc
  LEFT JOIN public.certifications c ON c.id = rc.certification_id
  LEFT JOIN user_certs uc ON uc.certification_id = rc.certification_id
  WHERE uc.certification_id IS NULL
  GROUP BY tu.assigned_to;
END;
$$;

-- Function to send deadline alerts
CREATE OR REPLACE FUNCTION public.send_deadline_alerts()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  doc_record RECORD;
  days_until_deadline INTEGER;
BEGIN
  FOR doc_record IN 
    SELECT * FROM public.documents 
    WHERE submission_deadline IS NOT NULL 
    AND submitted_at IS NULL
    AND is_approved = false
  LOOP
    days_until_deadline := EXTRACT(DAY FROM doc_record.submission_deadline - NOW());
    
    -- Check if alert should be sent (7 days, 3 days, 1 day before)
    IF days_until_deadline IN (7, 3, 1) THEN
      -- Create notification
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link
      )
      SELECT 
        doc_record.uploaded_by,
        'deadline_alert',
        'Document Deadline Approaching',
        'Document "' || doc_record.title || '" is due in ' || days_until_deadline || ' day(s)',
        '/documents/' || doc_record.id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.document_deadline_alerts 
        WHERE document_id = doc_record.id 
        AND alert_days_before = days_until_deadline
        AND sent_at IS NOT NULL
      );
      
      -- Record alert
      INSERT INTO public.document_deadline_alerts (
        document_id,
        alert_days_before
      ) VALUES (
        doc_record.id,
        days_until_deadline
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

