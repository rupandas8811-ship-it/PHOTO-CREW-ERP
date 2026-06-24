import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, key);

async function run() {
  const testLead = {
    lead_id: 'TST-' + Math.floor(1000 + Math.random() * 9000),
    customer_name: 'Test Event Type',
    mobile: '9999999999',
    lead_source: 'Instagram',
    email: 'test@example.com',
    event_date: '2026-07-01',
    event_time: '10:00:00',
    event_location: 'Mumbai',
    budget: 10000,
    sales_person: 'Admin',
    created_by: 'Admin',
    event_type: 'Hindu/Malayali Weddings', // New event type
    status: 'New Lead'
  };

  const { data, error } = await supabase.from('leads').insert(testLead).select();
  if (error) {
    console.log('Insert test failed:', error.message);
  } else {
    console.log('Insert test succeeded! Data:', data);
    // Cleanup
    await supabase.from('leads').delete().eq('lead_id', testLead.lead_id);
  }
}

run();
