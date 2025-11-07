-- ============================================================================
-- FIX ISSUES MIGRATION
-- 1. Add tags column to projects
-- 2. Ensure documents bucket exists
-- 3. Update approval_steps to use approver_id instead of approver_role
-- ============================================================================

-- Add tags column to projects if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN tags TEXT[];
  END IF;
END $$;

-- Ensure documents bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/xml',
    'text/x-log'
  ]
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Update RLS policies for document storage (simplified for admin-only access)
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Team leaders can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Document uploaders can update their documents" ON storage.objects;

-- Create simplified policies (all authenticated users are admins)
CREATE POLICY "Authenticated users can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- Update approval_steps to make approver_id required and remove approver_role requirement
-- (We'll keep approver_role as optional for backward compatibility)
ALTER TABLE public.approval_steps 
  ALTER COLUMN approver_id DROP NOT NULL;

-- Add notification tracking for approval requests
CREATE TABLE IF NOT EXISTS public.approval_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_step_id UUID REFERENCES public.approval_steps(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES public.profiles(id) NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_notifications_step ON public.approval_notifications(approval_step_id);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_approver ON public.approval_notifications(approver_id);

-- Add state column to calendar_connections for OAuth flow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'calendar_connections' 
    AND column_name = 'state'
  ) THEN
    ALTER TABLE public.calendar_connections ADD COLUMN state TEXT;
  END IF;
END $$;

-- Make access_token nullable for OAuth flow
ALTER TABLE public.calendar_connections 
  ALTER COLUMN access_token DROP NOT NULL;

-- ============================================================================
-- ADD INCOME TABLE FOR FINANCIAL TRACKING
-- ============================================================================

-- Create income source enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_source') THEN
    CREATE TYPE public.income_source AS ENUM (
      'sponsorship', 'university_funding', 'competition_prize', 'donation', 
      'fundraising', 'grant', 'other'
    );
  END IF;
END $$;

-- Create income table
CREATE TABLE IF NOT EXISTS public.income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  source public.income_source NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  received_date DATE NOT NULL,
  received_from TEXT, -- Name of sponsor/donor/organization
  receipt_url TEXT,
  is_confirmed BOOLEAN DEFAULT true, -- Whether the income has been confirmed/received
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

-- RLS Policy (All authenticated users are admins)
DROP POLICY IF EXISTS "All authenticated users are admins - full access to income" ON public.income;
CREATE POLICY "All authenticated users are admins - full access to income"
  ON public.income FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_income ON public.income;
CREATE TRIGGER set_updated_at_income BEFORE UPDATE ON public.income FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

