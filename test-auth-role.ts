import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

async function run() {
  const supabase = createClient(url, anonKey);
  console.log('Logging in as sale@photocrew.com...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'sale@photocrew.com',
    password: 'sales@123',
  });

  if (authErr) {
    console.error('Login failed:', authErr);
    return;
  }
  console.log('Logged in successfully!');

  // Select the user's role from public.users using auth context
  const { data: roleData, error: roleErr } = await supabase.rpc('get_user_role');
  console.log('get_user_role RPC returned:', roleData, 'Error:', roleErr);

  // Let's run a query that checks what role is returned inside a select
  const { data: testQuery, error: queryErr } = await supabase.from('users').select('id, role').eq('id', authData.user?.id);
  console.log('User row from public.users:', testQuery, 'Error:', queryErr);
}

run();
