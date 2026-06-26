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
  console.log('Current Session:', !!session);

  // First let's check role via RPC get_user_role
  const { data: role, error: roleErr } = await supabase.rpc('get_user_role');
  console.log('get_user_role RPC returned:', role, 'Error:', roleErr);

  const leadId = `LD-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const newLead = {
    lead_id: leadId,
    customer_name: 'Auth Test Prospect',
    mobile: '9876543210',
    lead_source: 'Google Ads',
    email: 'test@prospect.com',
    event_type: 'Weddings',
    event_date: new Date().toISOString().split('T')[0],
    event_time: '12:00:00',
    event_location: 'Grand Hyatt Beach Lawn',
    budget: 5000,
    sales_person: 'Sales',
    status: 'New Lead',
    created_by: 'Sales'
  };

  console.log('Attempting to insert lead...');
  const { error } = await supabase.from('leads').insert(newLead);
  if (error) {
    console.error("Insert failed! Error:", error);
  } else {
    console.log("Insert succeeded!");
    // Cleanup
    const serviceRoleSupabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    await serviceRoleSupabase.from('leads').delete().eq('lead_id', leadId);
    console.log("Cleanup complete!");
  }
}

run();
