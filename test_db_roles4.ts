import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data: leads } = await supabase.from('leads').select('lead_id, events, events_json').eq('lead_id', 'LD9039');
  console.log(JSON.stringify(leads, null, 2));
}
test();
