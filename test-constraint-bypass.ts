import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
async function run() {
  const { data: fetch1 } = await supabase.from('leads').select('*').limit(1);
  if (!fetch1 || fetch1.length === 0) return;
  const leadId = fetch1[0].lead_id;
  
  // mimic pushUpdate behavior
  const updates: any = { status: 'Staff Assigned' };
  
  if (updates.status) {
    updates.current_status = updates.status;
    const allowed = ['Closed']; // just dummy list missing Staff Assigned
    if (!allowed.includes(updates.status)) {
       delete updates.status;
    }
  }

  const { error } = await supabase.from('leads').update(updates).eq('lead_id', leadId).select();
  console.log("Error:", error);
  
  const { data } = await supabase.from('leads').select('current_status, status').eq('lead_id', leadId);
  console.log("Saved value:", data);
}
run();
