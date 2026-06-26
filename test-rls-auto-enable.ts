import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  console.log('Invoking rls_auto_enable...');
  const { data, error } = await supabase.rpc('rls_auto_enable');
  if (error) {
    console.error('rls_auto_enable failed:', error);
  } else {
    console.log('rls_auto_enable returned:', data);
  }
}

run();
