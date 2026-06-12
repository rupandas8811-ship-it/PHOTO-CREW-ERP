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
    password TEXT
);

-- 2. Add username column to public.users if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(255);

-- 3. Create index on username to facilitate high speed credential lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 4. Re-enable Row Level Security (RLS) on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Define Secure Row Level Security (RLS) Policies on public.users
-- Policies allow read for all authenticated users, updates to self, full access to owner, and allow auth-triggered inserts.

-- Business Owner can execute any write/read query
DROP POLICY IF EXISTS owner_users_policy ON public.users;
CREATE POLICY owner_users_policy ON public.users 
    FOR ALL USING (get_user_role() = 'Business Owner');

-- Other authenticated users can view staff directories
DROP POLICY IF EXISTS select_users_policy ON public.users;
CREATE POLICY select_users_policy ON public.users 
    FOR SELECT TO authenticated USING (true);

-- Users can update their own personal information
DROP POLICY IF EXISTS self_update_users_policy ON public.users;
CREATE POLICY self_update_users_policy ON public.users 
    FOR UPDATE TO authenticated USING (id = auth.uid());

-- Allow anonymous inserts to allow fallback signup if not using security-definers
DROP POLICY IF EXISTS anon_insert_users_policy ON public.users;
CREATE POLICY anon_insert_users_policy ON public.users
    FOR INSERT WITH CHECK (true);

-- 7. Update profile syncing trigger handle on auth.users sign-up
-- This copies custom registration metadata fields securely into public.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, active, mobile, username, password)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'Sales Team'),
    TRUE,
    COALESCE(new.raw_user_meta_data->>'mobile', ''),
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'password', 'temp123')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    mobile = EXCLUDED.mobile,
    role = EXCLUDED.role,
    username = EXCLUDED.username,
    password = EXCLUDED.password;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Hook trigger to auth.users after insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
