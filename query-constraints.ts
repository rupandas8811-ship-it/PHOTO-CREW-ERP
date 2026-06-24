import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  console.log('Querying check constraints on users...');
  // Since we cannot run raw SQL easily without a function, let's see if we can query information_schema views via postgrest.
  // By default, PostgREST doesn't expose information_schema, but let's try just in case, or see if it fails.
  const { data, error } = await supabase
    .from('information_schema.table_constraints')
    .select('*')
    .eq('table_name', 'users');

  if (error) {
    console.error('Failed to query information_schema.table_constraints directly:', error.message);
  } else {
    console.log('Table constraints:', data);
  }
}

run();
