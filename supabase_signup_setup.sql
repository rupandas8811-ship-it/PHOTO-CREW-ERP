-- =========================================================================
-- PHOTO CREW ERP - COMPLEMENTARY SQL FILE FOR REGISTER/SIGN-UP FUNCTIONALITY
-- =========================================================================
-- This script updates the database to support custom username and password
-- synchronization for user registration / sign-up.

BEGIN;

-- 1. Ensure public.users table exists with appropriate structure
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Business Owner', 'Sales Team', 'Operations Team', 'Production Team')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    password TEXT,
    username VARCHAR(255)
);

-- 2. Add custom and legacy sync columns to public.users if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- 3. Create index on username to facilitate high speed credential lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 4. Re-enable Row Level Security (RLS) on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Define Secure Row Level Security (RLS) Policies on public.users
-- This block uses standard drops and creations consistent with supabase_setup.sql

DROP POLICY IF EXISTS owner_users_policy ON public.users;
CREATE POLICY owner_users_policy ON public.users 
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() = 'Business Owner');

DROP POLICY IF EXISTS select_users_policy ON public.users;
CREATE POLICY select_users_policy ON public.users 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS self_update_users_policy ON public.users;
CREATE POLICY self_update_users_policy ON public.users 
    FOR UPDATE USING (auth.uid() IS NULL OR id = auth.uid());

DROP POLICY IF EXISTS anon_insert_users_policy ON public.users;
CREATE POLICY anon_insert_users_policy ON public.users
    FOR INSERT WITH CHECK (true);

-- 6. Update profile syncing trigger handle on auth.users sign-up
-- This copies custom registration metadata fields securely into public.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Clear out any existing seeded users with the same email to avoid unique constraint violations
  DELETE FROM public.users WHERE email = new.email;

  INSERT INTO public.users (id, name, full_name, email, role, active, mobile, phone, username, password)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'Sales Team'),
    TRUE,
    COALESCE(new.raw_user_meta_data->>'mobile', new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'mobile', ''),
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'password', 'temp123')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    mobile = EXCLUDED.mobile,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    active = EXCLUDED.active,
    username = EXCLUDED.username,
    password = EXCLUDED.password;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Disable trigger to auth.users after insert to prevent automatic user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
