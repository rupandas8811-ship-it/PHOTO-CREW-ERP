import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient('http://localhost:3000/supabase', process.env.SUPABASE_ANON_KEY || 'dummy');
async function run() {
  const { data: leads } = await supabase.from('leads').select('*').limit(1);
  if (!leads || leads.length === 0) { console.log('No leads'); return; }
  const leadId = leads[0].lead_id;
  const res = await supabase.from('leads').update({ whatsapp_number: '123' }).eq('lead_id', leadId);
  console.log('Update res:', res.error?.message);
}
run();
