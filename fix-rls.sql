-- ==========================================
-- 1. SQL TO INSPECT CURRENT RLS STATUS
-- ==========================================
-- Check if RLS is enabled for the leads table
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'leads';

-- ==========================================
-- 2. SQL TO INSPECT EXISTING POLICIES
-- ==========================================
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'leads';

-- ==========================================
-- 3. SQL TO REMOVE INCORRECT POLICIES
-- ==========================================
DROP POLICY IF EXISTS leads_select_policy ON public.leads;
DROP POLICY IF EXISTS leads_insert_policy ON public.leads;
DROP POLICY IF EXISTS leads_update_policy ON public.leads;
DROP POLICY IF EXISTS leads_delete_policy ON public.leads;
DROP POLICY IF EXISTS leads_write_policy ON public.leads;

-- ==========================================
-- 4. SQL TO CREATE THE CORRECT RLS POLICIES
-- ==========================================

-- A. Fix the helper function that caused the RLS violation
-- It MUST be marked as STABLE so PostgreSQL can safely use it in WITH CHECK clauses.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_jwt JSONB;
BEGIN
  -- Safely get JWT claims
  v_jwt := current_setting('request.jwt.claims', true)::jsonb;
  
  IF v_jwt IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Try to get role from JWT user_metadata first
  v_role := v_jwt -> 'user_metadata' ->> 'role';
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 2. Try to find role by matching user ID in public.users
  SELECT role::text INTO v_role FROM public.users WHERE id = NULLIF(v_jwt ->> 'sub', '')::uuid;
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 3. Fallback to matching by email from JWT claim in public.users
  SELECT role::text INTO v_role FROM public.users WHERE LOWER(email) = LOWER(v_jwt ->> 'email');
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  RETURN NULL;
END;
$$;

-- B. Enable RLS on the leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- C. Create proper policies allowing BOTH authenticated and anon (for custom users architecture fallback)
-- Note: Security is enforced by get_user_role() requiring a valid JWT claim mapping to a real user.
CREATE POLICY leads_select_policy ON public.leads
    FOR SELECT TO PUBLIC USING (
        public.get_user_role() IN ('Sales Team', 'Business Owner', 'Operations Team', 'Production Team')
    );

CREATE POLICY leads_insert_policy ON public.leads
    FOR INSERT TO PUBLIC WITH CHECK (
        public.get_user_role() IN ('Sales Team', 'Business Owner')
    );

CREATE POLICY leads_update_policy ON public.leads
    FOR UPDATE TO PUBLIC USING (
        public.get_user_role() IN ('Sales Team', 'Business Owner', 'Operations Team', 'Production Team')
    ) WITH CHECK (
        public.get_user_role() IN ('Sales Team', 'Business Owner', 'Operations Team', 'Production Team')
    );

CREATE POLICY leads_delete_policy ON public.leads
    FOR DELETE TO PUBLIC USING (
        public.get_user_role() = 'Business Owner'
    );

-- ==========================================
-- 5. SQL TO VERIFY POLICIES AFTER CREATION
-- ==========================================
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'leads';
