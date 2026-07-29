const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabaseClient.from('staff_assignments').select('updated_by').limit(1);
  console.log(data, error);
}
check();
