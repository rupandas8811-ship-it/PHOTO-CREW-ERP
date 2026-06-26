import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  const rpcs = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
  for (const rpc of rpcs) {
    console.log(`Trying RPC: ${rpc}...`);
    const { data, error } = await supabase.rpc(rpc, { sql: 'SELECT 1 as val;' });
    if (!error) {
      console.log(`Success with RPC ${rpc}:`, data);
      return;
    } else {
      console.log(`RPC ${rpc} failed:`, error.message);
    }
  }
}

run();
