-- ============================================================================
-- VERIFICATION SCRIPT FOR FORMULA IHU TEAM PREPARATION HUB
-- Run this in Supabase Dashboard SQL Editor to verify all migrations were applied
-- ============================================================================

-- 1. Verify all required tables exist
SELECT 
    'Tables Check' as check_type,
    COUNT(*) as found_count,
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ PASS - All 6 tables exist'
        ELSE '❌ FAIL - Missing tables'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones');

-- List all tables
SELECT 
    'Table: ' || table_name as item,
    '✅ EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones')
ORDER BY table_name;

-- 2. Verify all required enums exist
SELECT 
    'Enums Check' as check_type,
    COUNT(*) as found_count,
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ PASS - All 5 enums exist'
        ELSE '❌ FAIL - Missing enums'
    END as status
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typname IN ('department', 'task_priority', 'task_status', 'document_type', 'app_role');

-- List all enums
SELECT 
    'Enum: ' || typname as item,
    '✅ EXISTS' as status
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typname IN ('department', 'task_priority', 'task_status', 'document_type', 'app_role')
ORDER BY typname;

-- 3. Verify storage bucket exists
SELECT 
    'Storage Bucket Check' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS - Documents bucket exists'
        ELSE '❌ FAIL - Documents bucket missing'
    END as status
FROM storage.buckets 
WHERE name = 'documents';

-- Storage bucket details
SELECT 
    name,
    public,
    file_size_limit,
    '✅ EXISTS' as status
FROM storage.buckets 
WHERE name = 'documents';

-- 4. Verify key functions exist
SELECT 
    'Functions Check' as check_type,
    COUNT(*) as found_count,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ PASS - All 4 functions exist'
        ELSE '❌ FAIL - Missing functions'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('has_role', 'get_user_role', 'handle_new_user', 'handle_updated_at');

-- List all functions
SELECT 
    'Function: ' || routine_name as item,
    '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('has_role', 'get_user_role', 'handle_new_user', 'handle_updated_at')
ORDER BY routine_name;

-- 5. Verify triggers exist
SELECT 
    'Triggers Check' as check_type,
    COUNT(*) as found_count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ PASS - All triggers exist'
        ELSE '❌ FAIL - Missing triggers'
    END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND (trigger_name = 'on_auth_user_created' OR trigger_name = 'set_updated_at');

-- List all triggers
SELECT 
    'Trigger: ' || trigger_name || ' on ' || event_object_table as item,
    '✅ EXISTS' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND (trigger_name = 'on_auth_user_created' OR trigger_name = 'set_updated_at')
ORDER BY trigger_name, event_object_table;

-- 6. Verify RLS is enabled on all tables
SELECT 
    'RLS Check' as check_type,
    COUNT(*) as tables_with_rls,
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ PASS - RLS enabled on all tables'
        ELSE '❌ FAIL - Some tables missing RLS'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones')
AND rowsecurity = true;

-- List RLS status for each table
SELECT 
    'RLS on ' || tablename as item,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones')
ORDER BY tablename;

-- 7. Verify key RLS policies exist
SELECT 
    'RLS Policies Check' as check_type,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ PASS - Key policies exist'
        ELSE '⚠️ WARNING - Some policies may be missing'
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones');

-- List policies by table
SELECT 
    tablename,
    policyname,
    '✅ EXISTS' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones')
ORDER BY tablename, policyname;

-- 8. Verify storage policies exist
SELECT 
    'Storage Policies Check' as check_type,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ PASS - Storage policies exist'
        ELSE '❌ FAIL - Missing storage policies'
    END as status
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%documents%';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- If all checks show ✅ PASS, your database is fully configured!
-- If any show ❌ FAIL, you need to apply the missing migrations.
-- ============================================================================

