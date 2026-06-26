import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  const { data: tablesData, error: tablesErr } = await supabase.from('information_schema.tables').select('*');
  if (tablesErr) {
    console.error('info schema err', tablesErr.message);
  } else {
    //
  }

  const { data, error } = await supabase.rpc('get_user_role');
  const tables = ['users', 'leads', 'orders', 'operations', 'raw_footage', 'production', 'payments', 'activity_logs', 'notifications', 'production_staff', 'packages', 'lead_packages'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`[Admin] Table "${table}" error:`, error.message, 'Code:', error.code);
    } else {
      console.log(`[Admin] Table "${table}" succeeds! Row count:`, data.length);
    }
  }
}

run();
