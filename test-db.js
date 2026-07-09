import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://plrtavqnsbqopvqtwezb.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('lead_packages').select('editable_inclusions, editable_deliverables').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
