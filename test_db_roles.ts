import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data: leads } = await supabase.from('leads').select('lead_id, events, deliverables, raw_footage_details, team_requirements').eq('lead_id', 'LD054');
  console.log(JSON.stringify(leads, null, 2));
}
test();
