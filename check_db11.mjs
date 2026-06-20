import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: dbLeads, error } = await supabase.from('leads').select('lead_id, status, current_status').eq('lead_id', 'LD-9008');
  console.log("Before Trigger update:", dbLeads[0]);

  // Try updating just current_status
  const { data: up, error: err } = await supabase.from('leads').update({ current_status: 'Event Scheduled' }).eq('lead_id', 'LD-9008').select();
  console.log("After Trigger update data:", up);
}
check();
