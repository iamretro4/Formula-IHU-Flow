# Database Verification Instructions

## Quick Verification

To verify all migrations were applied correctly to your Supabase project:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/hirifbecooazbevauffq
   - Click on **SQL Editor** in the left sidebar

2. **Run Verification Script**
   - Open the file: `supabase/migrations/VERIFY_MIGRATIONS.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. **Check Results**
   - All checks should show ✅ PASS
   - If any show ❌ FAIL, you need to apply the missing migrations

## Expected Results

After running the verification script, you should see:

- ✅ **6 tables**: profiles, user_roles, tasks, projects, documents, milestones
- ✅ **5 enums**: department, task_priority, task_status, document_type, app_role
- ✅ **1 storage bucket**: documents (50MB limit)
- ✅ **4 functions**: has_role, get_user_role, handle_new_user, handle_updated_at
- ✅ **5+ triggers**: on_auth_user_created + set_updated_at triggers
- ✅ **RLS enabled** on all 6 tables
- ✅ **15+ RLS policies** configured
- ✅ **4 storage policies** for documents bucket

## If Verification Fails

If any checks fail, apply the migrations:

1. Open `supabase/migrations/APPLY_ALL_MIGRATIONS.sql`
2. Copy all contents
3. Paste into Supabase SQL Editor
4. Run the script
5. Run verification again

## Manual Quick Check

You can also manually check by running this simple query:

```sql
-- Quick check - should return 6 rows
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_roles', 'tasks', 'projects', 'documents', 'milestones')
ORDER BY table_name;
```

If this returns 6 rows, your tables are set up correctly!

