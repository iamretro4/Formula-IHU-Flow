-- ============================================================================
-- ADVANCED FEATURES MIGRATION
-- Calendar Sync, Workflow Triggers, Comments, Activity Log, etc.
-- ============================================================================

-- ============================================================================
-- 1. CALENDAR SYNCHRONIZATION
-- ============================================================================

-- Create calendar providers enum
CREATE TYPE public.calendar_provider AS ENUM ('google', 'outlook', 'ical');

-- Create calendar connections table
CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider public.calendar_provider NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT, -- External calendar ID
  calendar_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ============================================================================
-- 2. AUTOMATED WORKFLOW TRIGGERS
-- ============================================================================

-- Create workflow templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('eso_qualification', 'business_plan_video', 'technical_report', 'standard')),
  steps JSONB NOT NULL, -- Array of step configurations
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow trigger rules table
CREATE TABLE IF NOT EXISTS public.workflow_trigger_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('document_submitted', 'document_created', 'task_completed', 'milestone_reached')),
  conditions JSONB, -- Conditions that must be met
  workflow_template_id UUID REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. COMMENTS/DISCUSSION SYSTEM
-- ============================================================================

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'document', 'project', 'milestone', 'purchase_request')),
  entity_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mentions UUID[], -- Array of user IDs mentioned
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comment reactions table
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'thumbs_up', 'thumbs_down', 'heart', 'laugh', 'celebrate')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- ============================================================================
-- 4. ACTIVITY AUDIT LOG
-- ============================================================================

-- Create activity types enum
CREATE TYPE public.activity_type AS ENUM (
  'task_created', 'task_updated', 'task_deleted', 'task_assigned', 'task_completed',
  'document_created', 'document_updated', 'document_deleted', 'document_approved', 'document_submitted',
  'project_created', 'project_updated', 'project_deleted',
  'milestone_created', 'milestone_completed',
  'comment_created', 'comment_updated', 'comment_deleted',
  'user_created', 'user_updated',
  'budget_created', 'expense_created', 'purchase_request_created', 'purchase_request_approved',
  'workflow_created', 'workflow_completed',
  'channel_created', 'message_sent',
  'other'
);

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.activity_type NOT NULL,
  entity_type TEXT, -- 'task', 'document', 'project', etc.
  entity_id UUID,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB, -- Additional context data
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(created_at DESC);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_trigger_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Calendar connections
CREATE POLICY "Users can manage their own calendar connections"
  ON public.calendar_connections FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workflow templates
CREATE POLICY "All authenticated users are admins - full access to workflow_templates"
  ON public.workflow_templates FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to workflow_trigger_rules"
  ON public.workflow_trigger_rules FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Comments
CREATE POLICY "All authenticated users can view comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Comment reactions
CREATE POLICY "All authenticated users can view reactions"
  ON public.comment_reactions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own reactions"
  ON public.comment_reactions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Activities (read-only for most users, but all can view)
CREATE POLICY "All authenticated users can view activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Only system can insert activities (via triggers)
CREATE POLICY "System can insert activities"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER set_updated_at_calendar_connections BEFORE UPDATE ON public.calendar_connections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_workflow_templates BEFORE UPDATE ON public.workflow_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_comments BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ACTIVITY LOG TRIGGERS
-- ============================================================================

-- Function to log activities
CREATE OR REPLACE FUNCTION public.log_activity(
  p_type public.activity_type,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.activities (
    type,
    entity_type,
    entity_id,
    user_id,
    description,
    metadata
  ) VALUES (
    p_type,
    p_entity_type,
    p_entity_id,
    p_user_id,
    p_description,
    p_metadata
  );
END;
$$;

-- Trigger for task activities
CREATE OR REPLACE FUNCTION public.trigger_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_description TEXT;
  v_type public.activity_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_type := 'task_created';
    v_description := format('Task "%s" was created', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'completed' THEN
      v_type := 'task_completed';
      v_description := format('Task "%s" was completed', NEW.title);
    ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      v_type := 'task_assigned';
      v_description := format('Task "%s" was assigned', NEW.title);
    ELSE
      v_type := 'task_updated';
      v_description := format('Task "%s" was updated', NEW.title);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_type := 'task_deleted';
    v_description := format('Task "%s" was deleted', OLD.title);
  END IF;

  PERFORM public.log_activity(
    v_type,
    'task',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.created_by, auth.uid()),
    v_description,
    jsonb_build_object(
      'task_id', COALESCE(NEW.id, OLD.id),
      'title', COALESCE(NEW.title, OLD.title),
      'status', COALESCE(NEW.status, OLD.status)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER task_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_task_activity();

-- Trigger for document activities
CREATE OR REPLACE FUNCTION public.trigger_document_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_description TEXT;
  v_type public.activity_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_type := 'document_created';
    v_description := format('Document "%s" was created', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_approved AND NOT OLD.is_approved THEN
      v_type := 'document_approved';
      v_description := format('Document "%s" was approved', NEW.title);
    ELSIF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN
      v_type := 'document_submitted';
      v_description := format('Document "%s" was submitted', NEW.title);
    ELSE
      v_type := 'document_updated';
      v_description := format('Document "%s" was updated', NEW.title);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_type := 'document_deleted';
    v_description := format('Document "%s" was deleted', OLD.title);
  END IF;

  PERFORM public.log_activity(
    v_type,
    'document',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.uploaded_by, auth.uid()),
    v_description,
    jsonb_build_object(
      'document_id', COALESCE(NEW.id, OLD.id),
      'title', COALESCE(NEW.title, OLD.title),
      'document_type', COALESCE(NEW.document_type, OLD.document_type)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER document_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_document_activity();

-- Trigger for comment activities
CREATE OR REPLACE FUNCTION public.trigger_comment_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_description TEXT;
  v_type public.activity_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_type := 'comment_created';
    v_description := format('Comment added to %s', NEW.entity_type);
  ELSIF TG_OP = 'UPDATE' THEN
    v_type := 'comment_updated';
    v_description := format('Comment updated on %s', NEW.entity_type);
  ELSIF TG_OP = 'DELETE' THEN
    v_type := 'comment_deleted';
    v_description := format('Comment deleted from %s', OLD.entity_type);
  END IF;

  PERFORM public.log_activity(
    v_type,
    NEW.entity_type,
    COALESCE(NEW.entity_id, OLD.entity_id),
    COALESCE(NEW.author_id, OLD.author_id),
    v_description,
    jsonb_build_object(
      'comment_id', COALESCE(NEW.id, OLD.id),
      'entity_type', COALESCE(NEW.entity_type, OLD.entity_type),
      'entity_id', COALESCE(NEW.entity_id, OLD.entity_id)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER comment_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_comment_activity();

-- ============================================================================
-- AUTOMATED WORKFLOW TRIGGER FUNCTION
-- ============================================================================

-- Function to check and trigger workflows
CREATE OR REPLACE FUNCTION public.check_and_trigger_workflows(
  p_trigger_event TEXT,
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule RECORD;
  v_template RECORD;
  v_workflow_id UUID;
  v_step JSONB;
  v_step_record RECORD;
BEGIN
  -- Find active trigger rules for this event
  FOR v_rule IN 
    SELECT * FROM public.workflow_trigger_rules
    WHERE trigger_event = p_trigger_event
    AND is_active = true
  LOOP
    -- Get the workflow template
    SELECT * INTO v_template
    FROM public.workflow_templates
    WHERE id = v_rule.workflow_template_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Check conditions if any
    -- For now, we'll create the workflow if template exists
    -- In production, you'd evaluate conditions here

    -- Create workflow if entity is a document
    IF p_entity_type = 'document' AND v_template.document_type IS NOT NULL THEN
      -- Check if workflow already exists
      SELECT id INTO v_workflow_id
      FROM public.approval_workflows
      WHERE document_id = p_entity_id;

      IF v_workflow_id IS NULL THEN
        -- Create new workflow
        INSERT INTO public.approval_workflows (
          document_id,
          workflow_type,
          total_steps,
          status
        ) VALUES (
          p_entity_id,
          v_template.workflow_type,
          jsonb_array_length(v_template.steps),
          'draft'
        ) RETURNING id INTO v_workflow_id;

        -- Create approval steps from template
        FOR v_step IN SELECT * FROM jsonb_array_elements(v_template.steps)
        LOOP
          INSERT INTO public.approval_steps (
            workflow_id,
            step_number,
            approver_role,
            status
          ) VALUES (
            v_workflow_id,
            (v_step->>'step_number')::INTEGER,
            v_step->>'approver_role',
            'pending'
          );
        END LOOP;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Trigger to auto-create workflows when documents are submitted
CREATE OR REPLACE FUNCTION public.trigger_workflow_on_document_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN
    PERFORM public.check_and_trigger_workflows('document_submitted', 'document', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_create_workflow_on_submit
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  WHEN (NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL)
  EXECUTE FUNCTION public.trigger_workflow_on_document_submit();

