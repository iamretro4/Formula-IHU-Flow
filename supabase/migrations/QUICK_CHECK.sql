-- ============================================================================
-- QUICK CHECK - Run this first to see what's missing
-- ============================================================================

-- Check tables
SELECT 'TABLES' as check_type, 
       COUNT(*) as count,
       CASE WHEN COUNT(*) = 6 THEN '✅ All tables exist' ELSE '❌ Missing ' || (6 - COUNT(*))::text || ' tables' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones');

-- List missing tables (if any)
SELECT 'Missing Tables' as info, 
       table_name
FROM (SELECT unnest(ARRAY['profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones']) as table_name) t
WHERE table_name NOT IN (
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
);

-- Check storage bucket
SELECT 'STORAGE BUCKET' as check_type,
       COUNT(*) as count,
       CASE WHEN COUNT(*) > 0 THEN '✅ Bucket exists' ELSE '❌ Bucket missing' END as status
FROM storage.buckets 
WHERE name = 'documents';

