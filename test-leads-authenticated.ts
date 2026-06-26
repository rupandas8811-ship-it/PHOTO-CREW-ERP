import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, anonKey);

async function run() {
  console.log('Logging in as sale@photocrew.com...');
  const { data: authData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'sale@photocrew.com',
    password: 'sales@123'
  });

  if (loginErr) {
    console.error('Login failed:', loginErr.message);
    return;
  }

  console.log('Logged in successfully!');
  
  // Test role RPC
  const { data: role } = await supabase.rpc('get_user_role');
  console.log('Role RPC returned:', role);

  // Test selecting from leads
  console.log('Selecting from leads...');
  const { data: leads, error: selectErr } = await supabase.from('leads').select('*');
  if (selectErr) {
    console.error('Select leads failed:', selectErr);
  } else {
    console.log('Select leads succeeded! Rows count:', leads?.length);
  }
}

run();
