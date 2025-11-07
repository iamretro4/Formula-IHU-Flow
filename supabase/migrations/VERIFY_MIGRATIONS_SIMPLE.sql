-- ============================================================================
-- SIMPLE VERIFICATION SCRIPT - All results in one query
-- Run this in Supabase Dashboard SQL Editor
-- ============================================================================

WITH verification_results AS (
  SELECT 
    'Tables' as category,
    COUNT(*) as found,
    6 as expected,
    CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    string_agg(table_name, ', ' ORDER BY table_name) as details
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones')
  
  UNION ALL
  
  SELECT 
    'Enums' as category,
    COUNT(*) as found,
    5 as expected,
    CASE WHEN COUNT(*) = 5 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    string_agg(typname, ', ' ORDER BY typname) as details
  FROM pg_type 
  WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typname IN ('department', 'task_priority', 'task_status', 'document_type', 'app_role')
  
  UNION ALL
  
  SELECT 
    'Storage Bucket' as category,
    COUNT(*) as found,
    1 as expected,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    COALESCE(string_agg(name || ' (' || (file_size_limit/1024/1024)::text || 'MB)', ', '), 'Missing') as details
  FROM storage.buckets 
  WHERE name = 'documents'
  
  UNION ALL
  
  SELECT 
    'Functions' as category,
    COUNT(*) as found,
    4 as expected,
    CASE WHEN COUNT(*) = 4 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    string_agg(routine_name, ', ' ORDER BY routine_name) as details
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('has_role', 'get_user_role', 'handle_new_user', 'handle_updated_at')
  
  UNION ALL
  
  SELECT 
    'Triggers' as category,
    COUNT(*) as found,
    5 as expected,
    CASE WHEN COUNT(*) >= 5 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    string_agg(trigger_name || ' on ' || event_object_table, ', ' ORDER BY trigger_name, event_object_table) as details
  FROM information_schema.triggers 
  WHERE trigger_schema = 'public' 
  AND (trigger_name = 'on_auth_user_created' OR trigger_name = 'set_updated_at')
  
  UNION ALL
  
  SELECT 
    'RLS Enabled' as category,
    COUNT(*) as found,
    6 as expected,
    CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    string_agg(tablename, ', ' ORDER BY tablename) as details
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones')
  AND rowsecurity = true
  
  UNION ALL
  
  SELECT 
    'RLS Policies' as category,
    COUNT(*) as found,
    15 as expected,
    CASE WHEN COUNT(*) >= 15 THEN '✅ PASS' ELSE '⚠️ WARNING' END as status,
    COUNT(*)::text || ' policies found' as details
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones')
  
  UNION ALL
  
  SELECT 
    'Storage Policies' as category,
    COUNT(*) as found,
    4 as expected,
    CASE WHEN COUNT(*) >= 4 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
    string_agg(policyname, ', ' ORDER BY policyname) as details
  FROM pg_policies 
  WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%documents%'
)
SELECT 
  category,
  found || '/' || expected as count,
  status,
  details
FROM verification_results
ORDER BY 
  CASE status 
    WHEN '❌ FAIL' THEN 1
    WHEN '⚠️ WARNING' THEN 2
    WHEN '✅ PASS' THEN 3
  END,
  category;

