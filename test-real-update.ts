import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, anonKey);

async function run() {
  const { data: fetch1, error: e1 } = await supabase.from('leads').select('*').limit(1);
  if (!fetch1 || fetch1.length === 0) {
     console.log("No leads", e1); return;
  }
  const leadId = fetch1[0].lead_id;
  console.log("Testing on", leadId, "with current status:", fetch1[0].status);
  
  const { data, error } = await supabase.from('leads').update({ status: 'Editor Assigned' }).eq('lead_id', leadId).select();
  console.log("Update output:", data);
  console.log("Update error:", error);
}
run();
