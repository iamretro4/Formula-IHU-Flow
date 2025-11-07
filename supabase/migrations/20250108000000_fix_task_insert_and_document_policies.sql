-- Add INSERT policy for all authenticated users to create tasks
-- This allows members to create tasks, not just leadership roles
CREATE POLICY IF NOT EXISTS "All authenticated users can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add INSERT policy for all authenticated users to upload documents
-- This allows all users to upload documents
CREATE POLICY IF NOT EXISTS "All authenticated users can upload documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

