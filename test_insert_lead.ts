import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const newLead = {
    lead_id: 'LD9999',
    customer_name: 'Test Trigger',
    mobile: '1234567890',
    email: 'test@example.com',
    lead_source: 'Other',
    event_type: 'Other',
    event_location: 'TBD',
    budget: 0,
    event_date: '2026-07-28',
    event_time: '10:00',
    total_pax: 0,
    reference_source: 'None',
    status: 'New Lead',
    current_status: 'New Lead',
    created_date: new Date().toISOString().split('T')[0]
  };
  const { data, error } = await supabase.from('leads').insert([newLead]).select();
  console.log("INSERT RESULT:", data, error);
  
  // Clean up
  await supabase.from('leads').delete().eq('lead_id', 'LD9999');
}
run();
