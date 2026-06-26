-- =========================================================================
-- PHOTO CREW ERP - DATABASE SCHEMA AUDIT AND SCHEMA UPDATE MIGRATION
-- =========================================================================
-- This script contains all DDL statements to bring the existing Supabase schema
-- completely in line with the frontend inputs, structures, and TypeScript types.
-- It is designed to be 100% idempotent, safe to run multiple times, and preserves all data.

BEGIN;

-- =========================================================================
-- 1. UPDATE EXISTING TABLES WITH MISSING FIELDS (ALTERS)
-- =========================================================================

-- A. Update public.leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pincode VARCHAR(50);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS shoot_type VARCHAR(100);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reporting_time VARCHAR(20);

-- B. Update public.orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shoot_type VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reporting_time VARCHAR(20);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pincode VARCHAR(50);

-- C. Update public.raw_footage table
ALTER TABLE public.raw_footage ADD COLUMN IF NOT EXISTS storage_type VARCHAR(100) DEFAULT 'Google Drive';
ALTER TABLE public.raw_footage ADD COLUMN IF NOT EXISTS upload_notes TEXT;

-- D. Update public.payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_collection_status VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS additional_received NUMERIC DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- E. Update public.users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- F. Update public.packages table
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS duration VARCHAR(100);
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS package_includes TEXT;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);

-- G. Update public.production_staff table
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS commission_rate INTEGER DEFAULT 15;
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5;
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS production_role_speciality VARCHAR(255);
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS custom_role_specialty VARCHAR(255);
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS experience VARCHAR(100);
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.production_staff ADD COLUMN IF NOT EXISTS city VARCHAR(100);


-- =========================================================================
-- 2. CREATE MISSING TABLES WITH POLICIES AND INDEXES
-- =========================================================================

-- A. Table: production_specialties
CREATE TABLE IF NOT EXISTS public.production_specialties (
    speciality_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.production_specialties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_specialties_select ON public.production_specialties;
CREATE POLICY production_specialties_select ON public.production_specialties
    FOR SELECT USING (true);

DROP POLICY IF EXISTS production_specialties_write ON public.production_specialties;
CREATE POLICY production_specialties_write ON public.production_specialties
    FOR ALL USING (true);


-- B. Table: editor_assignments
CREATE TABLE IF NOT EXISTS public.editor_assignments (
    assignment_id VARCHAR(50) PRIMARY KEY,
    production_id VARCHAR(50) REFERENCES public.production(production_id) ON DELETE CASCADE,
    staff_id VARCHAR(50) REFERENCES public.production_staff(staff_id) ON DELETE CASCADE,
    staff_name VARCHAR(255) NOT NULL,
    speciality VARCHAR(100) NOT NULL,
    assigned_date DATE NOT NULL,
    target_finish_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Assigned', 'Editing Started', 'In Progress', 'Review Pending', 'Revision', 'Completed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.editor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editor_assignments_select ON public.editor_assignments;
CREATE POLICY editor_assignments_select ON public.editor_assignments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS editor_assignments_write ON public.editor_assignments;
CREATE POLICY editor_assignments_write ON public.editor_assignments
    FOR ALL USING (true);


-- C. Table: equipment
CREATE TABLE IF NOT EXISTS public.equipment (
    equipment_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Assigned', 'In Use', 'Under Maintenance', 'Damaged')),
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS equipment_select ON public.equipment;
CREATE POLICY equipment_select ON public.equipment
    FOR SELECT USING (true);

DROP POLICY IF EXISTS equipment_write ON public.equipment;
CREATE POLICY equipment_write ON public.equipment
    FOR ALL USING (true);


-- D. Table: equipment_handovers
CREATE TABLE IF NOT EXISTS public.equipment_handovers (
    handover_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES public.orders(order_id) ON DELETE CASCADE,
    equipment_name VARCHAR(255) NOT NULL,
    return_status VARCHAR(50) NOT NULL CHECK (return_status IN ('Returned', 'Not Returned', 'Damaged', 'Missing')),
    return_date DATE,
    returned_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.equipment_handovers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS equipment_handovers_select ON public.equipment_handovers;
CREATE POLICY equipment_handovers_select ON public.equipment_handovers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS equipment_handovers_write ON public.equipment_handovers;
CREATE POLICY equipment_handovers_write ON public.equipment_handovers
    FOR ALL USING (true);


-- =========================================================================
-- 3. INDEXES FOR NEW AND UPDATED TABLES
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_leads_shoot_type ON public.leads(shoot_type);
CREATE INDEX IF NOT EXISTS idx_orders_shoot_type ON public.orders(shoot_type);
CREATE INDEX IF NOT EXISTS idx_editor_assignments_production_id ON public.editor_assignments(production_id);
CREATE INDEX IF NOT EXISTS idx_editor_assignments_staff_id ON public.editor_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_equipment_handovers_order_id ON public.equipment_handovers(order_id);
CREATE INDEX IF NOT EXISTS idx_production_staff_employee_id ON public.production_staff(employee_id);


-- =========================================================================
-- 4. LOG AUDIT TRIGGERS FOR NEW TABLES (IF APPLICABLE)
-- =========================================================================

DROP TRIGGER IF EXISTS audit_production_specialties ON public.production_specialties;
CREATE TRIGGER audit_production_specialties 
    AFTER INSERT OR UPDATE OR DELETE ON public.production_specialties 
    FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_editor_assignments ON public.editor_assignments;
CREATE TRIGGER audit_editor_assignments 
    AFTER INSERT OR UPDATE OR DELETE ON public.editor_assignments 
    FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_equipment ON public.equipment;
CREATE TRIGGER audit_equipment 
    AFTER INSERT OR UPDATE OR DELETE ON public.equipment 
    FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

DROP TRIGGER IF EXISTS audit_equipment_handovers ON public.equipment_handovers;
CREATE TRIGGER audit_equipment_handovers 
    AFTER INSERT OR UPDATE OR DELETE ON public.equipment_handovers 
    FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

COMMIT;
