import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, anonKey);

async function run() {
  const { data: fetch1 } = await supabase.from('leads').select('*').limit(1);
  if (!fetch1 || fetch1.length === 0) return;
  const leadId = fetch1[0].lead_id;

  console.log("Testing on", leadId, "with current_status:", fetch1[0].current_status);
  
  const { data, error } = await supabase.from('leads').update({ current_status: 'Staff Assigned' }).eq('lead_id', leadId).select();
  console.log("Update output:", data);
  console.log("Update error:", error);

  // Re-fetch
  const { data: fetch2 } = await supabase.from('leads').select('*').eq('lead_id', leadId);
  console.log("Re-fetched:", fetch2?.[0]?.current_status);
}
run();
