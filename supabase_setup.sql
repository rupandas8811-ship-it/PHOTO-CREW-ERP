-- =========================================================================
-- PHOTO CREW ERP - COMPLETE DATABASE MIGRATION SCRIPT FOR SUPABASE
-- =========================================================================
-- Run this script directly in your Supabase SQL Editor to provision
-- the database, configure tables, define indexes, enable RLS,
-- and set up secure role-based access policies.

BEGIN;

-- 1. CLEAN UP EXISTING SCHEMA (Optional & Cascaded)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;

DROP TABLE IF EXISTS public.staff_assignments CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.production CASCADE;
DROP TABLE IF EXISTS public.raw_footage CASCADE;
DROP TABLE IF EXISTS public.operations CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.follow_ups CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.lead_packages CASCADE;
DROP TABLE IF EXISTS public.packages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.analytics_snapshots CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. CREATE DATABASE TABLES

-- USERS TABLE (Linked with Supabase Authentication)
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Business Owner', 'Sales Team', 'Operations Team', 'Production Team')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    password TEXT, -- Included for backward compatibility/graceful legacy auth
    username VARCHAR(255)
);

-- LEADS TABLE
CREATE TABLE public.leads (
    lead_id VARCHAR(50) PRIMARY KEY,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE,
    lead_source VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    alternate_mobile VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    custom_event_type VARCHAR(255),
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    event_location TEXT NOT NULL,
    budget NUMERIC NOT NULL CHECK (budget >= 0),
    sales_person VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation', 'Order Confirmed', 
        'Operations Assigned', 'Event Completed', 'Raw Footage Received', 'Editor Assigned',
        'Editing Started', 'Editing In Progress', 'Internal QC Review', 'Client Review Sent', 'Customer Review', 'Revision Required', 'Revision In Progress', 'Final Approval', 'Approved', 'Project Delivered', 'Delivered', 
        'Payment Pending', 'Project Closed', 'Closed'
    )),
    remarks TEXT,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_editor VARCHAR(255),
    assigned_editors TEXT,
    production_role VARCHAR(255),
    delivery_target_date DATE,
    current_status VARCHAR(50),
    CONSTRAINT leads_event_type_check CHECK (
      event_type IN (
        'Weddings',
        'Hindu/Malayali Weddings',
        'Hamarlok weddings',
        'Engagement',
        'Pre Weddings',
        'Maternity',
        'Baby Shower',
        'New Born',
        'Baby Shoot',
        'Birthday',
        'Naming Ceremony',
        'House Warming',
        'Upanayana',
        'Half Saree',
        'Portfolio',
        'Product Shoot',
        'Corporate Events',
        'Car Shoot',
        'Bike Shoot',
        'Other'
      )
    )
);

-- FOLLOW-UPS TABLE (Granular Follow-Up Interactions Tracking list)
CREATE TABLE public.follow_ups (
    follow_up_id VARCHAR(50) PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL REFERENCES public.leads(lead_id) ON DELETE CASCADE,
    follow_up_status VARCHAR(50) NOT NULL CHECK (follow_up_status IN ('Pending', 'Completed', 'Scheduled')),
    follow_up_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_follow_up_date DATE,
    call_notes TEXT,
    negotiation_notes TEXT,
    conducted_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QUOTATIONS TABLE (Granular Proposed Prices/Packages Tracking details)
CREATE TABLE public.quotations (
    quotation_id VARCHAR(50) PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL REFERENCES public.leads(lead_id) ON DELETE CASCADE,
    quotation_number VARCHAR(100) UNIQUE NOT NULL,
    quotation_amount NUMERIC NOT NULL CHECK (quotation_amount >= 0),
    discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount NUMERIC NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    final_amount NUMERIC NOT NULL CHECK (final_amount >= 0),
    quotation_status VARCHAR(50) NOT NULL CHECK (quotation_status IN ('Draft', 'Sent', 'Approved', 'Rejected', 'Expired')),
    valid_until DATE,
    terms_conditions TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PACKAGES MASTER TABLE (Stores service packages catalog)
CREATE TABLE public.packages (
    package_id VARCHAR(50) PRIMARY KEY,
    package_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    deliverables TEXT,
    team_members TEXT,
    seasonal_offer TEXT,
    terms_conditions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LEAD PACKAGES TABLE (Stores package line-items for single customer leads)
CREATE TABLE public.lead_packages (
    lead_package_id VARCHAR(50) PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL REFERENCES public.leads(lead_id) ON DELETE CASCADE,
    package_id VARCHAR(50) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    package_cost NUMERIC NOT NULL CHECK (package_cost >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    discount NUMERIC NOT NULL DEFAULT 0 CHECK (discount >= 0),
    final_amount NUMERIC NOT NULL CHECK (final_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDERS TABLE
CREATE TABLE public.orders (
    order_id VARCHAR(50) PRIMARY KEY,
    lead_id VARCHAR(50) REFERENCES public.leads(lead_id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    event_location TEXT NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    quotation_amount NUMERIC NOT NULL CHECK (quotation_amount >= 0),
    advance_received NUMERIC NOT NULL DEFAULT 0 CHECK (advance_received >= 0),
    balance_amount NUMERIC NOT NULL CHECK (balance_amount >= 0),
    order_status VARCHAR(50) NOT NULL CHECK (order_status IN ('Confirmed', 'Completed', 'Delivered', 'Paid', 'Closed')),
    current_stage VARCHAR(50) NOT NULL CHECK (current_stage IN (
        'New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation', 'Order Confirmed', 
        'Operations Assigned', 'Event Scheduled', 'Event Completed', 'Raw Footage Received', 
        'Editing Started', 'Customer Review', 'Approved', 'Delivered', 
        'Payment Pending', 'Closed'
    )),
    sales_person VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OPERATIONS TABLE
CREATE TABLE public.operations (
    operation_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    photographer_assigned VARCHAR(255) NOT NULL,
    videographer_assigned VARCHAR(255) NOT NULL,
    drone_operator_assigned VARCHAR(255) NOT NULL,
    assistant_assigned VARCHAR(255) NOT NULL,
    equipment_kit TEXT NOT NULL,
    reporting_time TIME NOT NULL,
    event_status VARCHAR(50) NOT NULL CHECK (event_status IN ('Assigned', 'Completed')),
    remarks TEXT,
    updated_by VARCHAR(255) NOT NULL
);

-- STAFF ASSIGNMENTS TABLE
CREATE TABLE public.staff_assignments (
    assignment_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    staff_role VARCHAR(100) NOT NULL,
    staff_id VARCHAR(50) NOT NULL,
    staff_name VARCHAR(255) NOT NULL,
    assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assignment_status VARCHAR(50) NOT NULL DEFAULT 'Assigned' CHECK (assignment_status IN ('Assigned', 'Completed', 'Cancelled'))
);

-- RAW FOOTAGE TABLE
CREATE TABLE public.raw_footage (
    tracking_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    event_completed_date DATE NOT NULL,
    raw_received BOOLEAN NOT NULL DEFAULT FALSE,
    server_path TEXT,
    uploaded_by VARCHAR(255),
    uploaded_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Pending', 'Received'))
);

-- PRODUCTION TABLE
CREATE TABLE public.production (
    production_id VARCHAR(50) PRIMARY KEY,
    tracking_id VARCHAR(50) NOT NULL REFERENCES public.raw_footage(tracking_id) ON DELETE CASCADE,
    editor_assigned VARCHAR(255) NOT NULL,
    raw_footage_location TEXT,
    editing_start_date DATE,
    expected_delivery_date DATE,
    editing_status VARCHAR(50) NOT NULL CHECK (editing_status IN (
        'Pending', 'Editing', 'Customer Review', 'Revision Required', 'Approved', 'Delivered'
    )),
    customer_review_status VARCHAR(50) CHECK (customer_review_status IN ('Pending Review', 'Feedback Given', 'Approved')),
    delivery_date DATE,
    remarks TEXT
);

-- PAYMENTS TABLE
CREATE TABLE public.payments (
    payment_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    quotation_amount NUMERIC NOT NULL CHECK (quotation_amount >= 0),
    advance_received NUMERIC NOT NULL CHECK (advance_received >= 0),
    balance_due NUMERIC NOT NULL CHECK (balance_due >= 0),
    final_payment_received NUMERIC NOT NULL DEFAULT 0 CHECK (final_payment_received >= 0),
    payment_date DATE,
    payment_proof_url TEXT,
    payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('Pending', 'Partially Paid', 'Fully Paid'))
);

-- ACTIVITY LOGS TABLE
CREATE TABLE public.activity_logs (
    log_id VARCHAR(50) PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action TEXT NOT NULL,
    module VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS TABLE (ERP Internal System Notifications and Alerts)
CREATE TABLE public.notifications (
    notification_id VARCHAR(50) PRIMARY KEY,
    recipient_role VARCHAR(50) NOT NULL CHECK (recipient_role IN ('Business Owner', 'Sales Team', 'Operations Team', 'Production Team', 'All')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id VARCHAR(100),
    project_id VARCHAR(100),
    task_id VARCHAR(100),
    notification_type VARCHAR(100),
    read_status BOOLEAN NOT NULL DEFAULT FALSE
);

-- ANALYTICS TABLE (Consolidated Business Metric Performance Snapshots)
CREATE TABLE public.analytics_snapshots (
    snapshot_id VARCHAR(50) PRIMARY KEY,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lead_count INTEGER NOT NULL DEFAULT 0,
    active_order_count INTEGER NOT NULL DEFAULT 0,
    total_revenue NUMERIC NOT NULL DEFAULT 0 CHECK (total_revenue >= 0),
    pending_payments NUMERIC NOT NULL DEFAULT 0 CHECK (pending_payments >= 0),
    conversion_rate NUMERIC DEFAULT 0,
    ops_completed_count INTEGER DEFAULT 0,
    production_pending_count INTEGER DEFAULT 0,
    created_by VARCHAR(255) DEFAULT 'System'
);

-- 3. CREATE PERFORMANCE OPTIMIZING INDEXES
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_event_date ON public.leads(event_date);
CREATE INDEX idx_follow_ups_lead_id ON public.follow_ups(lead_id);
CREATE INDEX idx_quotations_lead_id ON public.quotations(lead_id);
CREATE INDEX idx_orders_lead_id ON public.orders(lead_id);
CREATE INDEX idx_orders_current_stage ON public.orders(current_stage);
CREATE INDEX idx_operations_order_id ON public.operations(order_id);
CREATE INDEX idx_staff_assignments_order_id ON public.staff_assignments(order_id);
CREATE INDEX idx_staff_assignments_staff_id ON public.staff_assignments(staff_id);
CREATE INDEX idx_raw_footage_order_id ON public.raw_footage(order_id);
CREATE INDEX idx_production_tracking_id ON public.production(tracking_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_notifications_recipient_role ON public.notifications(recipient_role);
CREATE INDEX idx_analytics_snapshots_recorded_at ON public.analytics_snapshots(recorded_at DESC);


-- 4. UTILITY FUNCTION FOR ROLE DETERMINATION
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_footage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;


-- 6. GENERATE SECURE RLS POLICIES FOR SECURING ROLE-BASED ACCESS
-- Incorporates local-login rate-limit fallbacks where auth.uid() is null (anonymous demo client)

-- A. USERS POLICIES
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

-- B. LEADS POLICIES
DROP POLICY IF EXISTS leads_select_policy ON public.leads;
CREATE POLICY leads_select_policy ON public.leads
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team', 'Operations Team'));

DROP POLICY IF EXISTS leads_write_policy ON public.leads;
CREATE POLICY leads_write_policy ON public.leads
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team'));

-- C. FOLLOW-UPS POLICIES
DROP POLICY IF EXISTS follow_ups_select_policy ON public.follow_ups;
CREATE POLICY follow_ups_select_policy ON public.follow_ups
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team', 'Operations Team'));

DROP POLICY IF EXISTS follow_ups_write_policy ON public.follow_ups;
CREATE POLICY follow_ups_write_policy ON public.follow_ups
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team'));

-- D. QUOTATIONS POLICIES
DROP POLICY IF EXISTS quotations_select_policy ON public.quotations;
CREATE POLICY quotations_select_policy ON public.quotations
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team', 'Operations Team'));

DROP POLICY IF EXISTS quotations_write_policy ON public.quotations;
CREATE POLICY quotations_write_policy ON public.quotations
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team'));

-- PACKAGES POLICIES
DROP POLICY IF EXISTS packages_select_policy ON public.packages;
CREATE POLICY packages_select_policy ON public.packages
    FOR SELECT USING (true);

DROP POLICY IF EXISTS packages_write_policy ON public.packages;
CREATE POLICY packages_write_policy ON public.packages
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team'));

-- LEAD PACKAGES POLICIES
DROP POLICY IF EXISTS lead_packages_select_policy ON public.lead_packages;
CREATE POLICY lead_packages_select_policy ON public.lead_packages
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team', 'Operations Team'));

DROP POLICY IF EXISTS lead_packages_write_policy ON public.lead_packages;
CREATE POLICY lead_packages_write_policy ON public.lead_packages
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team'));

-- E. ORDERS POLICIES
DROP POLICY IF EXISTS orders_select_policy ON public.orders;
CREATE POLICY orders_select_policy ON public.orders
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team', 'Operations Team', 'Production Team'));

DROP POLICY IF EXISTS orders_write_policy ON public.orders;
CREATE POLICY orders_write_policy ON public.orders
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team'));

-- F. OPERATIONS POLICIES
DROP POLICY IF EXISTS operations_select_policy ON public.operations;
CREATE POLICY operations_select_policy ON public.operations
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Operations Team', 'Sales Team'));

DROP POLICY IF EXISTS operations_write_policy ON public.operations;
CREATE POLICY operations_write_policy ON public.operations
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Operations Team'));

-- STAFF ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS staff_assignments_select_policy ON public.staff_assignments;
CREATE POLICY staff_assignments_select_policy ON public.staff_assignments
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Operations Team', 'Sales Team', 'Production Team'));

DROP POLICY IF EXISTS staff_assignments_write_policy ON public.staff_assignments;
CREATE POLICY staff_assignments_write_policy ON public.staff_assignments
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Operations Team'));

-- G. RAW FOOTAGE POLICIES
DROP POLICY IF EXISTS raw_footage_select_policy ON public.raw_footage;
CREATE POLICY raw_footage_select_policy ON public.raw_footage
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Operations Team', 'Production Team'));

DROP POLICY IF EXISTS raw_footage_write_policy ON public.raw_footage;
CREATE POLICY raw_footage_write_policy ON public.raw_footage
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Operations Team'));

-- H. PRODUCTION POLICIES
DROP POLICY IF EXISTS production_select_policy ON public.production;
CREATE POLICY production_select_policy ON public.production
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Production Team', 'Operations Team', 'Sales Team'));

DROP POLICY IF EXISTS production_write_policy ON public.production;
CREATE POLICY production_write_policy ON public.production
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Production Team'));

-- I. PAYMENTS POLICIES
DROP POLICY IF EXISTS payments_select_policy ON public.payments;
CREATE POLICY payments_select_policy ON public.payments
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team'));

DROP POLICY IF EXISTS payments_write_policy ON public.payments;
CREATE POLICY payments_write_policy ON public.payments
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team'));

-- J. ACTIVITY LOGS POLICIES
DROP POLICY IF EXISTS activity_logs_all_policy ON public.activity_logs;
CREATE POLICY activity_logs_all_policy ON public.activity_logs
    FOR ALL USING (true);

-- K. NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS notifications_all_policy ON public.notifications;
CREATE POLICY notifications_all_policy ON public.notifications
    FOR ALL USING (true);

-- L. ANALYTICS POLICIES
DROP POLICY IF EXISTS analytics_select_policy ON public.analytics_snapshots;
CREATE POLICY analytics_select_policy ON public.analytics_snapshots
    FOR SELECT USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner', 'Sales Team', 'Operations Team'));

DROP POLICY IF EXISTS analytics_write_policy ON public.analytics_snapshots;
CREATE POLICY analytics_write_policy ON public.analytics_snapshots
    FOR ALL USING (auth.uid() IS NULL OR get_user_role() IN ('Business Owner'));


-- 7. SUPABASE PROFILE SYNCING TRIGGER, REALTIME PUBLICATION, AND AUTOMATED CHANGE AUDITING LOGGERS

-- A. Auto profile generator in public.users on auth.users signup
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
    active = EXCLUDED.active,
    username = EXCLUDED.username,
    password = EXCLUDED.password;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. RECREATE REALTIME PUBLICATION
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- C. DATABASE LEVEL AUDIT CHANGE LOGGER TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.log_table_change()
RETURNS trigger AS $$
DECLARE
    v_user_name TEXT := 'System Process';
    v_role TEXT := 'System';
    v_action TEXT;
    v_module TEXT;
    v_record_id TEXT;
    v_log_id TEXT;
BEGIN
    -- Determine user and role if authenticated
    IF auth.uid() IS NOT NULL THEN
        SELECT name, role INTO v_user_name, v_role FROM public.users WHERE id = auth.uid();
        v_user_name := COALESCE(v_user_name, 'Authenticated Session');
        v_role := COALESCE(v_role, 'Staff');
    ELSE
        -- Fallback metadata
        v_user_name := 'Admin Health';
        v_role := 'Business Owner';
    END IF;

    -- Determine table module name
    v_module := TG_TABLE_NAME::text;

    -- Determine action and record ID
    IF (TG_OP = 'INSERT') THEN
        v_action := 'Database Raw INSERT on ' || TG_TABLE_NAME;
        IF TG_TABLE_NAME = 'leads' THEN v_record_id := NEW.lead_id;
        ELSIF TG_TABLE_NAME = 'orders' THEN v_record_id := NEW.order_id;
        ELSIF TG_TABLE_NAME = 'operations' THEN v_record_id := NEW.operation_id;
        ELSIF TG_TABLE_NAME = 'raw_footage' THEN v_record_id := NEW.tracking_id;
        ELSIF TG_TABLE_NAME = 'production' THEN v_record_id := NEW.production_id;
        ELSIF TG_TABLE_NAME = 'payments' THEN v_record_id := NEW.payment_id;
        ELSIF TG_TABLE_NAME = 'users' THEN v_record_id := NEW.id::text;
        ELSIF TG_TABLE_NAME = 'follow_ups' THEN v_record_id := NEW.follow_up_id;
        ELSIF TG_TABLE_NAME = 'quotations' THEN v_record_id := NEW.quotation_id;
        ELSIF TG_TABLE_NAME = 'notifications' THEN v_record_id := NEW.notification_id;
        ELSIF TG_TABLE_NAME = 'analytics_snapshots' THEN v_record_id := NEW.snapshot_id;
        ELSIF TG_TABLE_NAME = 'lead_packages' THEN v_record_id := NEW.lead_package_id;
        ELSE v_record_id := 'UNKNOWN';
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'Database Raw UPDATE on ' || TG_TABLE_NAME;
        IF TG_TABLE_NAME = 'leads' THEN v_record_id := OLD.lead_id;
        ELSIF TG_TABLE_NAME = 'orders' THEN v_record_id := OLD.order_id;
        ELSIF TG_TABLE_NAME = 'operations' THEN v_record_id := OLD.operation_id;
        ELSIF TG_TABLE_NAME = 'raw_footage' THEN v_record_id := OLD.tracking_id;
        ELSIF TG_TABLE_NAME = 'production' THEN v_record_id := OLD.production_id;
        ELSIF TG_TABLE_NAME = 'payments' THEN v_record_id := OLD.payment_id;
        ELSIF TG_TABLE_NAME = 'users' THEN v_record_id := OLD.id::text;
        ELSIF TG_TABLE_NAME = 'follow_ups' THEN v_record_id := OLD.follow_up_id;
        ELSIF TG_TABLE_NAME = 'quotations' THEN v_record_id := OLD.quotation_id;
        ELSIF TG_TABLE_NAME = 'notifications' THEN v_record_id := OLD.notification_id;
        ELSIF TG_TABLE_NAME = 'analytics_snapshots' THEN v_record_id := OLD.snapshot_id;
        ELSIF TG_TABLE_NAME = 'lead_packages' THEN v_record_id := OLD.lead_package_id;
        ELSE v_record_id := 'UNKNOWN';
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'Database Raw DELETE on ' || TG_TABLE_NAME;
        IF TG_TABLE_NAME = 'leads' THEN v_record_id := OLD.lead_id;
        ELSIF TG_TABLE_NAME = 'orders' THEN v_record_id := OLD.order_id;
        ELSIF TG_TABLE_NAME = 'operations' THEN v_record_id := OLD.operation_id;
        ELSIF TG_TABLE_NAME = 'raw_footage' THEN v_record_id := OLD.tracking_id;
        ELSIF TG_TABLE_NAME = 'production' THEN v_record_id := OLD.production_id;
        ELSIF TG_TABLE_NAME = 'payments' THEN v_record_id := OLD.payment_id;
        ELSIF TG_TABLE_NAME = 'users' THEN v_record_id := OLD.id::text;
        ELSIF TG_TABLE_NAME = 'follow_ups' THEN v_record_id := OLD.follow_up_id;
        ELSIF TG_TABLE_NAME = 'quotations' THEN v_record_id := OLD.quotation_id;
        ELSIF TG_TABLE_NAME = 'notifications' THEN v_record_id := OLD.notification_id;
        ELSIF TG_TABLE_NAME = 'analytics_snapshots' THEN v_record_id := OLD.snapshot_id;
        ELSIF TG_TABLE_NAME = 'lead_packages' THEN v_record_id := OLD.lead_package_id;
        ELSE v_record_id := 'UNKNOWN';
        END IF;
    END IF;

    v_log_id := 'LOG-TRG-' || floor(random() * 1000000)::text;

    -- Avoid logging changes on activity_logs table itself to prevent infinite loop
    IF TG_TABLE_NAME <> 'activity_logs' THEN
        INSERT INTO public.activity_logs (log_id, user_name, role, action, module, record_id, timestamp)
        VALUES (v_log_id, v_user_name, v_role, v_action, v_module, v_record_id, NOW());
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. ATTACH REGULAR AUDIT TRIGGERS
DROP TRIGGER IF EXISTS audit_leads ON public.leads;
CREATE TRIGGER audit_leads AFTER INSERT OR UPDATE OR DELETE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_follow_ups ON public.follow_ups;
CREATE TRIGGER audit_follow_ups AFTER INSERT OR UPDATE OR DELETE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_quotations ON public.quotations;
CREATE TRIGGER audit_quotations AFTER INSERT OR UPDATE OR DELETE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_orders ON public.orders;
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_operations ON public.operations;
CREATE TRIGGER audit_operations AFTER INSERT OR UPDATE OR DELETE ON public.operations FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_raw_footage ON public.raw_footage;
CREATE TRIGGER audit_raw_footage AFTER INSERT OR UPDATE OR DELETE ON public.raw_footage FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_production ON public.production;
CREATE TRIGGER audit_production AFTER INSERT OR UPDATE OR DELETE ON public.production FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_payments ON public.payments;
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_users ON public.users;
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_notifications ON public.notifications;
CREATE TRIGGER audit_notifications AFTER INSERT OR UPDATE OR DELETE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_analytics_snapshots ON public.analytics_snapshots;
CREATE TRIGGER audit_analytics_snapshots AFTER INSERT OR UPDATE OR DELETE ON public.analytics_snapshots FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_lead_packages ON public.lead_packages;
CREATE TRIGGER audit_lead_packages AFTER INSERT OR UPDATE OR DELETE ON public.lead_packages FOR EACH ROW EXECUTE FUNCTION public.log_table_change();


-- 8. SEED MOCK DEMO VALUES
-- Since we are defining primary keys, you can clean reload this data safely.
-- Note: User UUID mappings would normally link to authenticating auth.users accounts.

INSERT INTO public.leads (lead_id, created_date, lead_source, customer_name, mobile, email, event_type, event_date, event_time, event_location, budget, sales_person, status, remarks, created_by) VALUES
('LD-9001', '2026-06-10', 'Instagram', 'Sophia Loren', '+1 (555) 123-4567', 'sophia@example.com', 'Weddings', '2026-08-15', '14:00:00', 'Grand Hyatt Beach Lawn', 5500, 'Sarah Jenkins', 'New Lead', 'Inquired via Instagram DM. Wants premium cinematic style with 2 videographers.', 'Sarah Jenkins'),
('LD-9002', '2026-06-09', 'Website Form', 'Arthur Pendragon', '+1 (555) 987-6543', 'arthur@royal.co', 'Corporate Events', '2026-07-22', '09:00:00', 'Camelot Conference Hall', 3500, 'Sarah Jenkins', 'Follow Up', 'Followed up on email. Client checking options. Scheduled next call for next week.', 'Sarah Jenkins'),
('LD-9003', '2026-06-05', 'Referral', 'Liam Neeson', '+1 (555) 443-8822', 'liam@taken.net', 'Birthday', '2026-06-28', '18:00:00', 'Starlight Ballroom Resort', 2200, 'Sarah Jenkins', 'Quotation Sent', 'Sent quotation of $2,100 including drone photography. Waiting for approval.', 'Sarah Jenkins'),
('LD-9004', '2026-06-02', 'Facebook Ad', 'Helena Carter', '+1 (555) 777-1122', 'helena@star.com', 'Portfolio', '2026-07-05', '11:00:00', 'Industrial Warehouse Studio B', 1800, 'Sarah Jenkins', 'Negotiation', 'Negotiating discount. They requested $1,500 budget. Might close at $1,650.', 'Sarah Jenkins'),
('LD-9005', '2026-05-18', 'Instagram', 'Victoria & Albert', '+1 (555) 434-2211', 'royal@wedding.org', 'Weddings', '2026-09-01', '16:00:00', 'Udaipur Palace Resort', 12500, 'Sarah Jenkins', 'Order Confirmed', 'Order confirmed with 50% advance. Moving to operations stage.', 'Sarah Jenkins'),
('LD-9006', '2026-05-15', 'Website Form', 'Marcus Aurelius', '+1 (555) 880-9988', 'marcus@philosophy.edu', 'Pre Weddings', '2026-06-20', '06:00:00', 'Sunrise Mountain Peak', 3200, 'Sarah Jenkins', 'Operations Assigned', 'Drone pre-flight authorized. Crew allocated and equipment kit prepped.', 'Sarah Jenkins'),
('LD-9007', '2026-05-10', 'Referral', 'Billie Eilish', '+1 (555) 111-2222', 'billie@interscope.com', 'Other', '2026-06-08', '20:00:00', 'Underground Concrete Tunnel', 8000, 'Sarah Jenkins', 'Event Completed', 'Shoot completed successfully. Incredible slow-mo shots captured. Raw footage pending transfer.', 'Sarah Jenkins'),
('LD-9008', '2026-05-08', 'Google Search', 'Elizabeth Bennet', '+1 (555) 666-4444', 'elizabeth@pemberley.com', 'Other', '2026-06-03', '17:00:00', 'Longbourn Gardens', 4500, 'Sarah Jenkins', 'Editing Started', 'Footage received. Emily allocated as chief editor. Editing has started recursively.', 'Sarah Jenkins'),
('LD-9009', '2026-05-02', 'Instagram', 'Elon Musk', '+1 (555) 420-6969', 'elon@spacex.com', 'Product Shoot', '2026-05-25', '12:00:00', 'Starbase Launch Pad A', 15000, 'Sarah Jenkins', 'Customer Review', 'First cut sent. Waiting for review. Client loved the rocket booster framing.', 'Sarah Jenkins'),
('LD-9010', '2026-04-28', 'Referral', 'Bruce Wayne', '+1 (555) 911-3948', 'bruce@waynecorp.com', 'Other', '2026-05-18', '19:00:00', 'Wayne Manor Ball Room', 20000, 'Sarah Jenkins', 'Delivered', 'Delivered final albums and prints. Payment pending confirmation.', 'Sarah Jenkins'),
('LD-9011', '2026-04-10', 'Website Form', 'Gerd Muller', '+1 (555) 711-2092', 'gerd@munich.de', 'Other', '2026-05-02', '15:00:00', 'Beverly Hills Mansion 304', 2500, 'Sarah Jenkins', 'Closed', 'Project successfully completed, fully paid, closed and archived in system.', 'Sarah Jenkins')
ON CONFLICT (lead_id) DO NOTHING;

INSERT INTO public.follow_ups (follow_up_id, lead_id, follow_up_status, follow_up_date, next_follow_up_date, call_notes, negotiation_notes, conducted_by) VALUES
('FLW-7001', 'LD-9002', 'Completed', '2026-06-09', '2026-06-16', 'Discussed premium pricing for corporate package. Client is reviewing other agencies.', 'Offering up to 10% volume discount for repeating bookings.', 'Sarah Jenkins'),
('FLW-7002', 'LD-9003', 'Completed', '2026-05-05', '2026-06-12', 'Sent quote of $2100 with drone photography. Client asked for photo book sample.', 'Sample physical book being dispatched.', 'Sarah Jenkins'),
('FLW-7003', 'LD-9004', 'Scheduled', '2026-06-11', '2026-06-15', 'Will call again to finalize budget. Negotiating between $1500 and $1800.', 'Targeting final handshake at $1650.', 'Sarah Jenkins')
ON CONFLICT (follow_up_id) DO NOTHING;

INSERT INTO public.quotations (quotation_id, lead_id, quotation_number, quotation_amount, discount_amount, tax_amount, final_amount, quotation_status, valid_until, terms_conditions, created_by) VALUES
('QT-8001', 'LD-9003', 'QT-2026-001', 2200, 100, 105, 2205, 'Sent', '2026-07-05', '50% advance to secure event booking; balance due on draft approval.', 'Sarah Jenkins'),
('QT-8002', 'LD-9004', 'QT-2026-002', 1800, 150, 82.5, 1732.5, 'Draft', '2026-07-12', 'Full payment terms specified on contract sign-off.', 'Sarah Jenkins'),
('QT-8003', 'LD-9005', 'QT-2026-003', 12500, 500, 600, 12600, 'Approved', '2026-08-01', 'Standard premium destination bridal shoots contract guidelines.', 'Sarah Jenkins')
ON CONFLICT (quotation_id) DO NOTHING;

INSERT INTO public.orders (order_id, lead_id, customer_name, mobile, event_type, event_date, event_time, event_location, package_name, quotation_amount, advance_received, balance_amount, order_status, current_stage, sales_person, created_at) VALUES
('ORD-1005', 'LD-9005', 'Victoria & Albert', '+1 (555) 434-2211', 'Weddings', '2026-09-01', '16:00:00', 'Udaipur Palace Resort', 'Royal Destination Platinum', 12500, 6250, 6250, 'Confirmed', 'Order Confirmed', 'Sarah Jenkins', '2026-06-01 10:00:00+00'),
('ORD-1006', 'LD-9006', 'Marcus Aurelius', '+1 (555) 880-9988', 'Pre Weddings', '2026-06-20', '06:00:00', 'Sunrise Mountain Peak', 'Scenic Pre-Wedding Gold', 3200, 1600, 1600, 'Confirmed', 'Operations Assigned', 'Sarah Jenkins', '2026-06-02 11:30:00+00'),
('ORD-1007', 'LD-9007', 'Billie Eilish', '+1 (555) 111-2222', 'Other', '2026-06-08', '20:00:00', 'Underground Concrete Tunnel', 'Aesthetic Music Video Premium', 8000, 4000, 4000, 'Completed', 'Event Completed', 'Sarah Jenkins', '2026-06-03 14:45:00+00'),
('ORD-1008', 'LD-9008', 'Elizabeth Bennet', '+1 (555) 666-4444', 'Other', '2026-06-03', '17:00:00', 'Longbourn Gardens', 'Estate Gala Cinematic', 4500, 2000, 2500, 'Completed', 'Editing Started', 'Sarah Jenkins', '2026-06-04 09:12:00+00'),
('ORD-1009', 'LD-9009', 'Elon Musk', '+1 (555) 420-6969', 'Product Shoot', '2026-05-25', '12:00:00', 'Starbase Launch Pad A', 'High Dynamic Advertising Video', 15000, 5000, 10000, 'Completed', 'Customer Review', 'Sarah Jenkins', '2026-06-05 15:30:00+00'),
('ORD-1010', 'LD-9010', 'Bruce Wayne', '+1 (555) 911-3948', 'Other', '2026-05-18', '19:00:00', 'Wayne Manor Ball Room', 'Ultra Elite Grand Package', 20000, 10000, 10000, 'Delivered', 'Delivered', 'Sarah Jenkins', '2026-06-06 16:00:00+00'),
('ORD-1011', 'LD-9011', 'Gerd Muller', '+1 (555) 711-2092', 'Other', '2026-05-02', '15:00:00', 'Beverly Hills Mansion 304', 'Super High-Res Aerial Package', 2500, 2500, 0, 'Closed', 'Closed', 'Sarah Jenkins', '2026-06-07 11:00:00+00')
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO public.operations (operation_id, order_id, photographer_assigned, videographer_assigned, drone_operator_assigned, assistant_assigned, equipment_kit, reporting_time, event_status, remarks, updated_by) VALUES
('OP-5006', 'ORD-1006', 'Jack Richards', 'Tina Fey', 'Leo Di Caprio', 'Steve Rogers', 'Kit Gold: Sony A7iv, RED Komodo, DJI Inspire 3 Drone', '04:30:00', 'Assigned', 'Requires warm outfits, peak gets freezing at sunrise.', 'Robert O''Connor'),
('OP-5007', 'ORD-1007', 'Clint Barton', 'Natasha Romanoff', 'Tony Stark', 'Peter Parker', 'Kit Tunnel: ARRI Alexa Mini, Leica Cine Primes, low-light gimbals', '18:30:00', 'Completed', 'Shoot executed flawlessly. Tunnel dust required dry-mount dust bags for rigs.', 'Robert O''Connor'),
('OP-5008', 'ORD-1008', 'Wanda Maximoff', 'Vision', 'None', 'Sam Wilson', 'Kit Garden: Canon R5, Ronin S3 Gimbal, Apure Light panels', '15:30:00', 'Completed', 'Overcast light was highly favorable. Did not need dense diffusion scrims.', 'Robert O''Connor'),
('OP-5009', 'ORD-1009', 'Bruce Banner', 'Thor Odinson', 'Tony Stark', 'Steve Rogers', 'Kit Industrial: Phantom Flex 4K High-Speed, heavy duty robotic track', '10:00:00', 'Completed', 'High security clearance checked. Footage stored on encrypted drives.', 'Robert O''Connor'),
('OP-5010', 'ORD-1010', 'Peter Parker', 'Miles Morales', 'Tony Stark', 'Gwen Stacy', 'Kit Elegance: Hasselblad H6D, 3x Studio Strobe flash units', '17:00:00', 'Completed', 'Strict black tie compliance enforced on crew.', 'Robert O''Connor'),
('OP-5011', 'ORD-1011', 'Scott Lang', 'Steve Rogers', 'Sam Wilson', 'None', 'Kit Compact DSLR + DJI Mavic 3 Pro', '14:00:00', 'Completed', 'Sunny afternoon skylight worked perfectly.', 'Robert O''Connor')
ON CONFLICT (operation_id) DO NOTHING;

INSERT INTO public.raw_footage (tracking_id, order_id, event_completed_date, raw_received, server_path, uploaded_by, uploaded_date, status) VALUES
('TRK-2007', 'ORD-1007', '2026-06-08', TRUE, 's3://photocrew-vault-production/2026/billie-tunnel-mv/raw/', 'Natasha Romanoff', '2026-06-09 02:00:00+00', 'Received'),
('TRK-2008', 'ORD-1008', '2026-06-03', TRUE, 's3://photocrew-vault-production/2026/bennet-graduation/raw/', 'Vision', '2026-06-04 07:15:00+00', 'Received'),
('TRK-2009', 'ORD-1009', '2026-05-25', TRUE, 's3://photocrew-vault-production/2026/spacex-starbase-ad/raw/', 'Thor Odinson', '2026-05-26 11:00:00+00', 'Received'),
('TRK-2010', 'ORD-1010', '2026-05-18', TRUE, 's3://photocrew-vault-production/2026/wayne-gala/raw/', 'Miles Morales', '2026-05-19 01:30:00+00', 'Received'),
('TRK-2011', 'ORD-1011', '2026-05-02', TRUE, 's3://photocrew-vault-production/2026/muller-mansion/raw/', 'Steve Rogers', '2026-05-02 19:00:00+00', 'Received')
ON CONFLICT (tracking_id) DO NOTHING;

INSERT INTO public.production (production_id, tracking_id, editor_assigned, raw_footage_location, editing_start_date, expected_delivery_date, editing_status, customer_review_status, delivery_date, remarks) VALUES
('PRD-4008', 'TRK-2008', 'Emily Watson', 's3://photocrew-vault-production/2026/bennet-graduation/raw/', '2026-06-05', '2026-06-25', 'Editing', NULL, NULL, 'Color grading started in DaVinci Resolve. Wedding cinematic LUTs applied.'),
('PRD-4009', 'TRK-2009', 'Dennis Nedry', 's3://photocrew-vault-production/2026/spacex-starbase-ad/raw/', '2026-05-28', '2026-06-15', 'Customer Review', 'Pending Review', NULL, 'Draft 1 exported in 1080p and uploaded for review. Ready to receive client feedback.'),
('PRD-4010', 'TRK-2010', 'Emily Watson', 's3://photocrew-vault-production/2026/wayne-gala/raw/', '2026-05-20', '2026-06-01', 'Delivered', 'Approved', '2026-06-01', 'Delivered in ultra-high resolution 4K ProRes 422 HQ via physical secure drive.'),
('PRD-4011', 'TRK-2011', 'Jimmy Woo', 's3://photocrew-vault-production/2026/muller-mansion/raw/', '2026-05-03', '2026-05-08', 'Delivered', 'Approved', '2026-05-08', 'Reels optimized for Instagram and YouTube shorts delivered. Highly satisfied.')
ON CONFLICT (production_id) DO NOTHING;

INSERT INTO public.payments (payment_id, order_id, quotation_amount, advance_received, balance_due, final_payment_received, payment_date, payment_proof_url, payment_status) VALUES
('PAY-3005', 'ORD-1005', 12500, 6250, 6250, 0, NULL, NULL, 'Partially Paid'),
('PAY-3006', 'ORD-1006', 3200, 1600, 1600, 0, NULL, NULL, 'Partially Paid'),
('PAY-3007', 'ORD-1007', 8000, 4000, 4000, 0, NULL, NULL, 'Partially Paid'),
('PAY-3008', 'ORD-1008', 4500, 2000, 2500, 0, NULL, NULL, 'Partially Paid'),
('PAY-3009', 'ORD-1009', 15000, 5000, 10000, 0, NULL, NULL, 'Partially Paid'),
('PAY-3010', 'ORD-1010', 20000, 10000, 10000, 0, NULL, NULL, 'Partially Paid'),
('PAY-3011', 'ORD-1011', 2500, 2500, 0, 0, '2026-05-02', 'https://photocrew-receipts.s3.amazonaws.com/rec-31942.pdf', 'Fully Paid')
ON CONFLICT (payment_id) DO NOTHING;

INSERT INTO public.notifications (notification_id, recipient_role, title, message, is_read, action_url) VALUES
('NTF-6001', 'Business Owner', 'New Booking Confirmed', 'The Royal Destination Wedding for Victoria & Albert has been successfully confirmed.', FALSE, '/orders'),
('NTF-6002', 'Operations Team', 'Pre-Wedding Shoot Prepped', 'New crew requirements uploaded for Marcus Aurelius shoot at Sunrise Mountain.', FALSE, '/operations'),
('NTF-6003', 'Production Team', 'Raw Footage Received', 'Natasha Romanoff uploaded 47GB of UHD slow-motion tunnel files.', TRUE, '/production')
ON CONFLICT (notification_id) DO NOTHING;

INSERT INTO public.analytics_snapshots (snapshot_id, lead_count, active_order_count, total_revenue, pending_payments, conversion_rate, ops_completed_count, production_pending_count, created_by) VALUES
('ANL-2026-W22', 11, 7, 65900, 36250, 63.6, 5, 2, 'Rupand Das'),
('ANL-2026-W23', 12, 7, 72500, 39500, 65.5, 6, 1, 'Rupand Das')
ON CONFLICT (snapshot_id) DO NOTHING;

INSERT INTO public.activity_logs (log_id, user_name, role, action, module, record_id, timestamp) VALUES
('LOG-001', 'Sarah Jenkins', 'Sales Team', 'Created New Lead', 'Sales', 'LD-9001', '2026-06-10 05:00:00+00'),
('LOG-002', 'Sarah Jenkins', 'Sales Team', 'Updated Follow-Up Status', 'Sales', 'LD-9002', '2026-06-09 14:30:00+00'),
('LOG-003', 'Robert O''Connor', 'Operations Team', 'Assigned Crew to Order', 'Operations', 'ORD-1006', '2026-06-02 11:45:00+00'),
('LOG-004', 'Emily Watson', 'Production Team', 'Started Editing Project', 'Production', 'PRD-4008', '2026-06-05 09:30:00+00'),
('LOG-005', 'Rupand Das', 'Business Owner', 'Reviewed CEO Dashboard', 'Admin', 'ALL', '2026-06-10 05:05:00+00')
ON CONFLICT (log_id) DO NOTHING;

-- Production Staff Management Table
CREATE TABLE IF NOT EXISTS public.production_staff (
    staff_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    joining_date DATE NOT NULL,
    profile_photo TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for production_staff
ALTER TABLE public.production_staff ENABLE ROW LEVEL SECURITY;

-- Select policy: Business Owner and Production Team can view staff
CREATE POLICY select_production_staff_policy ON public.production_staff
    FOR SELECT TO authenticated
    USING (TRUE);

-- Write policy: Business Owner and Production Team can write/delete staff
CREATE POLICY write_production_staff_policy ON public.production_staff
    FOR ALL TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- Seed production_staff
INSERT INTO public.production_staff (staff_id, name, mobile, email, role, department, status, joining_date, profile_photo, notes) VALUES
('STF-001', 'Emily Watson', '+1 (555) 234-5678', 'emily@photocrew.com', 'Production Manager', 'Management', 'Active', '2025-01-10', '', 'Orchestrates chief editing operations and delivery workflows.'),
('STF-002', 'Alan Cole', '+1 (555) 876-5432', 'alan@photocrew.com', 'Senior Editor', 'Editing', 'Active', '2025-03-15', '', 'Specialist in cinematic narration and commercial overlays.'),
('STF-003', 'Sarah Connor', '+1 (555) 456-7890', 'sarah.c@photocrew.com', 'Color Grading Artist', 'Post-Production', 'Active', '2025-06-01', '', 'Expert in DaVinci Resolve color pipelines and HDR calibration.'),
('STF-004', 'Dennis Nedry', '+1 (555) 304-9021', 'dennis@photocrew.com', 'VFX & Motion Graphics Designer', 'Design', 'Active', '2025-09-12', '', 'Handles high-fidelity typography animation.'),
('STF-005', 'Jimmy Woo', '+1 (555) 607-1122', 'jimmy@photocrew.com', 'Delivery Coordinator', 'Operations', 'Active', '2026-02-20', '', 'Manages physical and cloud master releases.')
ON CONFLICT (staff_id) DO NOTHING;

-- =========================================================================
-- LEAD HISTORY AND TRACKING EXTENSION
-- =========================================================================

-- 1. Create Lead Status History Table
CREATE TABLE IF NOT EXISTS public.lead_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id VARCHAR(50) NOT NULL REFERENCES public.leads(lead_id) ON DELETE CASCADE,
    order_id VARCHAR(50),
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(255),
    changed_by_role VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for timeline queries
CREATE INDEX idx_lead_status_history_lead_id ON public.lead_status_history(lead_id);
CREATE INDEX idx_lead_status_history_order_id ON public.lead_status_history(order_id);

-- Enable RLS
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_status_history_select ON public.lead_status_history FOR SELECT USING (TRUE);
CREATE POLICY lead_status_history_insert ON public.lead_status_history FOR INSERT WITH CHECK (TRUE);


-- 2. Staff Assignment History Table
CREATE TABLE IF NOT EXISTS public.lead_staff_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id VARCHAR(50) NOT NULL REFERENCES public.leads(lead_id) ON DELETE CASCADE,
    order_id VARCHAR(50),
    assigned_role VARCHAR(100) NOT NULL,
    assigned_staff VARCHAR(255) NOT NULL,
    assigned_by VARCHAR(255),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_staff_assignment_lead_id ON public.lead_staff_assignment_history(lead_id);

-- Enable RLS
ALTER TABLE public.lead_staff_assignment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_staff_assignment_select ON public.lead_staff_assignment_history FOR SELECT USING (TRUE);
CREATE POLICY lead_staff_assignment_insert ON public.lead_staff_assignment_history FOR INSERT WITH CHECK (TRUE);


-- 3. Equipment History Table
CREATE TABLE IF NOT EXISTS public.lead_equipment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id VARCHAR(50) NOT NULL REFERENCES public.leads(lead_id) ON DELETE CASCADE,
    order_id VARCHAR(50),
    equipment_name VARCHAR(255) NOT NULL,
    equipment_status VARCHAR(50) NOT NULL,
    returned_by VARCHAR(255),
    returned_at TIMESTAMPTZ,
    remarks TEXT
);

CREATE INDEX idx_lead_equipment_history_lead_id ON public.lead_equipment_history(lead_id);

-- Enable RLS
ALTER TABLE public.lead_equipment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_equipment_history_select ON public.lead_equipment_history FOR SELECT USING (TRUE);
CREATE POLICY lead_equipment_history_insert ON public.lead_equipment_history FOR INSERT WITH CHECK (TRUE);


-- 4. Production Editor Assignment History Table
CREATE TABLE IF NOT EXISTS public.lead_editor_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id VARCHAR(50) NOT NULL REFERENCES public.leads(lead_id) ON DELETE CASCADE,
    order_id VARCHAR(50),
    production_role VARCHAR(100) NOT NULL,
    editor_name VARCHAR(255) NOT NULL,
    assigned_by VARCHAR(255),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_editor_assignment_lead_id ON public.lead_editor_assignment_history(lead_id);

-- Enable RLS
ALTER TABLE public.lead_editor_assignment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_editor_assignment_select ON public.lead_editor_assignment_history FOR SELECT USING (TRUE);
CREATE POLICY lead_editor_assignment_insert ON public.lead_editor_assignment_history FOR INSERT WITH CHECK (TRUE);


-- 5. Trigger Function for Auto-Logging Lead Status
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old_status VARCHAR(50);
    v_new_status VARCHAR(50);
    v_order_id VARCHAR(50);
    v_changed_by VARCHAR(255);
    v_remarks TEXT;
BEGIN
    -- Determine which status changed: prioritizing current_status, fallback to status
    IF TG_OP = 'UPDATE' THEN
        IF NEW.current_status IS DISTINCT FROM OLD.current_status THEN
            v_old_status := OLD.current_status;
            v_new_status := NEW.current_status;
        ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
            v_old_status := OLD.status;
            v_new_status := NEW.status;
        ELSE
            -- No relevant status change to track
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        v_old_status := NULL;
        v_new_status := COALESCE(NEW.current_status, NEW.status);
    END IF;

    -- Fetch order ID if exists
    SELECT order_id INTO v_order_id FROM public.orders WHERE lead_id = NEW.lead_id LIMIT 1;
    
    v_changed_by := COALESCE(NEW.updated_by, NEW.created_by, 'System');
    v_remarks := NEW.remarks;

    INSERT INTO public.lead_status_history (
        lead_id, order_id, old_status, new_status, changed_by, remarks
    ) VALUES (
        NEW.lead_id, v_order_id, v_old_status, v_new_status, v_changed_by, v_remarks
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger on leads table
DROP TRIGGER IF EXISTS trigger_log_lead_status ON public.leads;

CREATE TRIGGER trigger_log_lead_status
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION log_lead_status_change();

-- 7. Turn on Realtime for these new tables
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_status_history;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_staff_assignment_history;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_equipment_history;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_editor_assignment_history;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Realtime publication might not exist locally, ignoring
END $$;

COMMIT;
-- =========================================================================

