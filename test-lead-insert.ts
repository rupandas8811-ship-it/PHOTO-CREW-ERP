import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, anonKey);

async function run() {
  const leadId = `LD-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const newLead = {
    lead_id: leadId,
    customer_name: 'Test Prospect',
    mobile: '9876543210',
    lead_source: 'Google Ads',
    email: '',
    event_type: 'Other',
    event_date: new Date().toISOString().split('T')[0],
    event_time: '12:00',
    event_location: 'TBD',
    budget: 0,
    sales_person: 'Sarah Jenkins',
    status: 'New Lead',
    created_by: 'Sarah Jenkins'
  };

  const { data, error } = await supabase.from('leads').insert(newLead).select();
  if (error) {
    console.error("Insert failed with error:", error);
  } else {
    console.log("Insert succeeded!", data);
    // Cleanup
    await supabase.from('leads').delete().eq('lead_id', leadId);
    console.log("Cleanup complete!");
  }
}
run();
