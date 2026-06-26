import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  const { data: policies, error } = await supabase.rpc('get_user_role'); // Wait, let's query pg_policies using an arbitrary select from a view or run SQL if possible, or wait!
  // Can we run SQL via a direct select?
  // Let's try to query pg_policies using supabase.from() or select * from pg_policies.
  // Wait, pg_policies is a system table, so we might not have exposed it in API. But let's check!
  const { data: pol, error: polErr } = await supabase.from('pg_policies').select('*').eq('tablename', 'leads');
  console.log('Policies for leads:', pol, polErr);
}

run();
