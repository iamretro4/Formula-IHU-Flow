-- ============================================================================
-- AUTOMATED WORKFLOW TRIGGERS
-- ============================================================================

-- Function to auto-create workflow when document is submitted
CREATE OR REPLACE FUNCTION public.auto_create_workflow_on_document_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_workflow_template RECORD;
  v_workflow_id UUID;
  v_step RECORD;
BEGIN
  -- Only trigger when document is first submitted
  IF NEW.submitted_at IS NOT NULL AND (OLD.submitted_at IS NULL OR OLD.submitted_at IS DISTINCT FROM NEW.submitted_at) THEN
    -- Check if workflow template exists for this document type
    SELECT * INTO v_workflow_template
    FROM public.workflow_templates
    WHERE document_type = NEW.document_type
    AND is_active = true
    LIMIT 1;

    -- If no template, use default workflow
    IF v_workflow_template IS NULL THEN
      -- Create default workflow
      INSERT INTO public.approval_workflows (
        document_id,
        status,
        workflow_type
      ) VALUES (
        NEW.id,
        'submitted',
        NEW.document_type::text
      ) RETURNING id INTO v_workflow_id;

      -- Create default approval step (assign to team leader)
      INSERT INTO public.approval_steps (
        workflow_id,
        step_number,
        approver_id,
        status
      )
      SELECT
        v_workflow_id,
        1,
        id,
        'pending'
      FROM public.profiles
      WHERE role = 'team_leader'
      LIMIT 1;
    ELSE
      -- Use template
      INSERT INTO public.approval_workflows (
        document_id,
        status,
        workflow_type
      ) VALUES (
        NEW.id,
        'submitted',
        NEW.document_type::text
      ) RETURNING id INTO v_workflow_id;

      -- Create steps from template
      FOR v_step IN
        SELECT * FROM public.workflow_template_steps
        WHERE template_id = v_workflow_template.id
        ORDER BY step_number
      LOOP
        INSERT INTO public.approval_steps (
          workflow_id,
          step_number,
          approver_id,
          status,
          required_role
        ) VALUES (
          v_workflow_id,
          v_step.step_number,
          v_step.approver_id,
          'pending',
          v_step.required_role
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for auto-creating workflows
DROP TRIGGER IF EXISTS on_document_submitted_create_workflow ON public.documents;
CREATE TRIGGER on_document_submitted_create_workflow
  AFTER INSERT OR UPDATE OF submitted_at ON public.documents
  FOR EACH ROW
  WHEN (NEW.submitted_at IS NOT NULL)
  EXECUTE FUNCTION public.auto_create_workflow_on_document_submission();

-- Function to escalate overdue approvals
CREATE OR REPLACE FUNCTION public.escalate_overdue_approvals()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_step RECORD;
  v_days_overdue INTEGER;
BEGIN
  FOR v_step IN
    SELECT 
      s.*,
      w.document_id,
      d.title as document_title
    FROM public.approval_steps s
    JOIN public.approval_workflows w ON s.workflow_id = w.id
    JOIN public.documents d ON w.document_id = d.id
    WHERE s.status = 'pending'
    AND s.created_at < NOW() - INTERVAL '3 days' -- 3 days overdue
  LOOP
    v_days_overdue := EXTRACT(DAY FROM NOW() - v_step.created_at)::INTEGER;

    -- Create notification for escalation
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link
    ) VALUES (
      v_step.approver_id,
      'document_approval',
      'Overdue Approval Required',
      format('Approval for document "%s" is %s days overdue. Please review immediately.', 
        v_step.document_title, v_days_overdue),
      format('/approval-workflows?step=%s', v_step.id)
    );

    -- Notify team leader if very overdue (7+ days)
    IF v_days_overdue >= 7 THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link
      )
      SELECT
        id,
        'document_approval',
        'Critical: Overdue Approval',
        format('Document "%s" has been pending approval for %s days. Immediate action required.', 
          v_step.document_title, v_days_overdue),
        format('/approval-workflows?step=%s', v_step.id)
      FROM public.profiles
      WHERE role = 'team_leader'
      LIMIT 1;
    END IF;
  END LOOP;
END;
$$;

-- Note: This function should be called by a scheduled job (pg_cron or external scheduler)

-- Create workflow templates table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workflow_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  approver_id UUID REFERENCES public.profiles(id),
  required_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_template_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view workflow templates"
  ON public.workflow_templates FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can manage workflow templates"
  ON public.workflow_templates FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can view template steps"
  ON public.workflow_template_steps FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can manage template steps"
  ON public.workflow_template_steps FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

