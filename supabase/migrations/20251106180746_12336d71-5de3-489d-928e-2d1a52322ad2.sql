-- CRITICAL SECURITY FIX: Move roles to separate table to prevent privilege escalation
-- Step 1: Drop all policies that depend on the role column
DROP POLICY IF EXISTS "Team leaders can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Team leaders and directors can create projects" ON public.projects;
DROP POLICY IF EXISTS "Team leaders and directors can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own tasks or tasks they created" ON public.tasks;
DROP POLICY IF EXISTS "Directors and team leaders can approve documents" ON public.documents;
DROP POLICY IF EXISTS "Directors and team leaders can manage milestones" ON public.milestones;

-- Step 2: Drop the role column and user_role enum
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Step 3: Create app_role enum for the new secure roles table
CREATE TYPE public.app_role AS ENUM ('team_leader', 'director', 'chief', 'member');

-- Step 4: Create secure user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  department department NULL, -- Only for directors and chiefs
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, department)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create security definer functions (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'team_leader' THEN 1
      WHEN 'director' THEN 2
      WHEN 'chief' THEN 3
      WHEN 'member' THEN 4
    END
  LIMIT 1
$$;

-- Step 6: Update handle_new_user function to add default member role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.email
    );
    
    -- Assign default member role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
    
    RETURN NEW;
END;
$$;

-- Step 7: RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Team leaders can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_leader'));

CREATE POLICY "Team leaders can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_leader'))
  WITH CHECK (public.has_role(auth.uid(), 'team_leader'));

-- Step 8: Recreate profiles RLS policies
CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Team leaders can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_leader'));

-- Step 9: Recreate tasks RLS policies
CREATE POLICY "Team leaders can manage all tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_leader'))
  WITH CHECK (public.has_role(auth.uid(), 'team_leader'));

CREATE POLICY "Directors and chiefs can manage tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'chief'))
  WITH CHECK (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'chief'));

CREATE POLICY "Users can update their assigned tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- Step 10: Recreate projects RLS policies
CREATE POLICY "Team leaders can manage all projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_leader'))
  WITH CHECK (public.has_role(auth.uid(), 'team_leader'));

CREATE POLICY "Directors can manage projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'director'))
  WITH CHECK (public.has_role(auth.uid(), 'director'));

-- Step 11: Recreate documents RLS policies  
CREATE POLICY "Team leaders can manage all documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_leader'))
  WITH CHECK (public.has_role(auth.uid(), 'team_leader'));

CREATE POLICY "Directors can approve documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'director'));

-- Step 12: Recreate milestones RLS policies
CREATE POLICY "Team leaders can manage all milestones"
  ON public.milestones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_leader'))
  WITH CHECK (public.has_role(auth.uid(), 'team_leader'));

CREATE POLICY "Directors can manage milestones"
  ON public.milestones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'director'))
  WITH CHECK (public.has_role(auth.uid(), 'director'));