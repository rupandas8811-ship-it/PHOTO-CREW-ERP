import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: dbLeads } = await supabase.from('leads').select('lead_id, status, current_status').limit(1);
  const leadId = dbLeads[0].lead_id;
  
  // Try sending 'status'
  const updatePayload = { status: 'Staff Assigned' }; 
  const { data, error: updateErr } = await supabase.from('leads').update(updatePayload).eq('lead_id', leadId).select();
  console.log("Update Error Status:", updateErr?.message);

  // Try sending 'current_status'
  const updatePayload2 = { current_status: 'Staff Assigned' }; 
  const { data: d2, error: updateErr2 } = await supabase.from('leads').update(updatePayload2).eq('lead_id', leadId).select();
  console.log("Update Error Current Status:", updateErr2?.message);
}
check();
