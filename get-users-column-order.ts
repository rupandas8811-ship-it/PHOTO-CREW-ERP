import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  // Let's query information_schema.columns via an rpc if we have one or we can query users directly and inspect the keys and values.
  // Wait, we can query raw columns using supabase.rpc but we don't have get_table_columns rpc working.
  // But wait, can we write an RPC that runs a query? Yes, let's look at supabase_setup.sql or create one if possible.
  // But wait, can we just get the columns of users?
  // Let's fetch a single row from users and print BOTH keys and values to see their mapped relation!
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample Row:', data[0]);
  }
}

run();
