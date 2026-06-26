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

  const session = authData.session;
  console.log('Logged in successfully! User ID:', session?.user?.id);
  
  const { data: roleData, error: roleErr } = await supabase.rpc('get_user_role');
  console.log('RPC get_user_role:', roleData, roleErr?.message);

  const newLead = {
    lead_id: 'L-8888',
    customer_name: 'Auth Test Prospect',
    mobile: '9876543210',
    lead_source: 'Google Ads',
    status: 'New Lead',
    current_status: 'New Lead'
  };

  console.log('Attempting to insert lead...');
  const { error } = await supabase.from('leads').insert(newLead);
  if (error) {
    console.error("Insert failed! Error:", error);
  } else {
    console.log("Insert succeeded!");
  }
}

run();
