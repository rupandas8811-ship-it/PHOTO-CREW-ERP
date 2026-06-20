import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: dbLeads } = await supabase.from('leads').select('lead_id, status, current_status').eq('lead_id', 'LD-9008');
  console.log("Lead:", dbLeads[0]);
}
check();
