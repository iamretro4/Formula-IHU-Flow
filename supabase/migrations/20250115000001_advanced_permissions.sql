-- Advanced Permissions System
-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    resource_type TEXT NOT NULL, -- 'task', 'document', 'project', 'milestone', etc.
    action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'approve', etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL, -- 'team_leader', 'director', 'chief', 'member'
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- Create user_permissions table for custom permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    resource_id UUID, -- Specific resource ID (optional, for resource-level permissions)
    resource_type TEXT, -- Type of resource
    granted BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, permission_id, resource_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Users can view role permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Users can view their own user permissions" ON public.user_permissions FOR SELECT USING (auth.uid() = user_id);

-- Insert default permissions
INSERT INTO public.permissions (name, resource_type, action, description) VALUES
('task:create', 'task', 'create', 'Create new tasks'),
('task:read', 'task', 'read', 'View tasks'),
('task:update', 'task', 'update', 'Update tasks'),
('task:delete', 'task', 'delete', 'Delete tasks'),
('task:assign', 'task', 'assign', 'Assign tasks to users'),
('document:create', 'document', 'create', 'Create new documents'),
('document:read', 'document', 'read', 'View documents'),
('document:update', 'document', 'update', 'Update documents'),
('document:delete', 'document', 'delete', 'Delete documents'),
('document:approve', 'document', 'approve', 'Approve documents'),
('project:create', 'project', 'create', 'Create new projects'),
('project:read', 'project', 'read', 'View projects'),
('project:update', 'project', 'update', 'Update projects'),
('project:delete', 'project', 'delete', 'Delete projects'),
('project:manage', 'project', 'manage', 'Full project management'),
('milestone:create', 'milestone', 'create', 'Create milestones'),
('milestone:read', 'milestone', 'read', 'View milestones'),
('milestone:update', 'milestone', 'update', 'Update milestones'),
('milestone:delete', 'milestone', 'delete', 'Delete milestones'),
('user:manage', 'user', 'manage', 'Manage users and permissions'),
('report:view', 'report', 'view', 'View reports'),
('report:export', 'report', 'export', 'Export reports'),
('settings:manage', 'settings', 'manage', 'Manage system settings')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Team Leaders get all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'team_leader', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Directors get most permissions except user management
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'director', id FROM public.permissions
WHERE name NOT IN ('user:manage', 'settings:manage')
ON CONFLICT DO NOTHING;

-- Chiefs get task and document permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'chief', id FROM public.permissions
WHERE resource_type IN ('task', 'document', 'milestone')
ON CONFLICT DO NOTHING;

-- Members get basic read and create permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'member', id FROM public.permissions
WHERE action IN ('read', 'create') AND resource_type IN ('task', 'document')
ON CONFLICT DO NOTHING;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
    p_user_id UUID,
    p_permission_name TEXT,
    p_resource_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
    v_has_role_permission BOOLEAN;
    v_has_user_permission BOOLEAN;
BEGIN
    -- Get user's role
    SELECT role INTO v_user_role
    FROM public.user_roles
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Check role-based permission
    SELECT EXISTS(
        SELECT 1
        FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role = v_user_role
        AND p.name = p_permission_name
    ) INTO v_has_role_permission;

    IF v_has_role_permission THEN
        RETURN true;
    END IF;

    -- Check user-specific permission
    SELECT EXISTS(
        SELECT 1
        FROM public.user_permissions up
        JOIN public.permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id
        AND p.name = p_permission_name
        AND (p_resource_id IS NULL OR up.resource_id = p_resource_id)
        AND up.granted = true
    ) INTO v_has_user_permission;

    RETURN v_has_user_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

