import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
async function run() {
  const { data: fetch1 } = await supabase.from('leads').select('*').limit(1);
  if (!fetch1 || fetch1.length === 0) return;
  const leadId = fetch1[0].lead_id;
  const { error } = await supabase.from('leads').update({ status: 'Staff Assigned' }).eq('lead_id', leadId).select();
  console.log("Lead update 'Staff Assigned' error:", error);
  const { error: e2 } = await supabase.from('leads').update({ status: 'Event Scheduled' }).eq('lead_id', leadId).select();
  console.log("Lead update 'Event Scheduled' error:", e2);
}
run();
