import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  const { error } = await supabase.rpc('run_sql', { query: `
    DROP POLICY IF EXISTS leads_insert_policy ON public.leads;
    CREATE POLICY leads_insert_policy ON public.leads FOR INSERT WITH CHECK (true);
  `});
  console.log('Error dropping/creating policy:', error);
}
run();
