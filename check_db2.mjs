import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: dbLeads, error } = await supabase.from('leads').select('lead_id, status, current_status').limit(1);
  console.log("Lead:", dbLeads[0]);
  
  const leadId = dbLeads[0].lead_id;
  const updatePayload = { current_status: 'Staff Assigned' }; // simulating what the pushUpdate did after deleting status
  const { data, error: updateErr } = await supabase.from('leads').update(updatePayload).eq('lead_id', leadId).select();
  console.log("Update Error:", updateErr);
  console.log("Update Data:", data);
}
check();
