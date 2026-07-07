import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function fixPaymentsRls() {
  console.log('Fixing RLS for payments table...');
  const sql = `
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable INSERT for authenticated users on payments" ON payments;
    DROP POLICY IF EXISTS "Enable UPDATE for authenticated users on payments" ON payments;
    DROP POLICY IF EXISTS "Enable SELECT for authenticated users on payments" ON payments;

    CREATE POLICY "Enable SELECT for authenticated users on payments" 
    ON payments FOR SELECT 
    TO authenticated 
    USING (true);

    CREATE POLICY "Enable INSERT for authenticated users on payments" 
    ON payments FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

    CREATE POLICY "Enable UPDATE for authenticated users on payments" 
    ON payments FOR UPDATE 
    TO authenticated 
    USING (true);
  `;
  
  const { data, error } = await supabase.rpc('run_sql', { query: sql });
  if (error) {
    console.log("Error running SQL via RPC run_sql:", error);
  } else {
    console.log("Successfully ran SQL to update payments table RLS policies.");
  }
}

fixPaymentsRls();
