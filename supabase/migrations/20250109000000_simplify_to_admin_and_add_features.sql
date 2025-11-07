-- ============================================================================
-- SIMPLIFY TO ADMIN-ONLY AND ADD NEW FEATURES
-- ============================================================================

-- Step 1: Simplify RLS policies - everyone is admin (all authenticated users have full access)
-- Drop all role-based policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Team leaders can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Team leaders can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Team leaders can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "All authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leaders can manage all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Directors and chiefs can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "All authenticated users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "All authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Team leaders can manage all projects" ON public.projects;
DROP POLICY IF EXISTS "Directors can manage projects" ON public.projects;
DROP POLICY IF EXISTS "All authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Team leaders can manage all documents" ON public.documents;
DROP POLICY IF EXISTS "Directors can approve documents" ON public.documents;
DROP POLICY IF EXISTS "All authenticated users can upload documents" ON public.documents;
DROP POLICY IF EXISTS "All authenticated users can view milestones" ON public.milestones;
DROP POLICY IF EXISTS "Team leaders can manage all milestones" ON public.milestones;
DROP POLICY IF EXISTS "Directors can manage milestones" ON public.milestones;

-- Create simple admin policies (all authenticated users are admins)
CREATE POLICY "All authenticated users are admins - full access to profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users are admins - full access to milestones"
  ON public.milestones FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Step 2: Make project_id required for tasks
ALTER TABLE public.tasks 
  ALTER COLUMN project_id SET NOT NULL;

-- Step 3: Add difficulty field to tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert'));

-- Step 4: Create subtasks table
CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id),
  due_date TIMESTAMPTZ,
  completion_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subtasks
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- RLS policy for subtasks (all authenticated users are admins)
CREATE POLICY "All authenticated users are admins - full access to subtasks"
  ON public.subtasks FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add updated_at trigger for subtasks
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Step 5: Update storage policies to allow all authenticated users
DROP POLICY IF EXISTS "Team leaders can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Document uploaders can update their documents" ON storage.objects;

CREATE POLICY "All authenticated users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

