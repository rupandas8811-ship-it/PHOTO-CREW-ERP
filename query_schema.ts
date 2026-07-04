import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);
async function run() {
  const { data, error } = await supabase.rpc('run_sql', { query: `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'quotations';
  ` });
  console.log(data, error);
}
run();
