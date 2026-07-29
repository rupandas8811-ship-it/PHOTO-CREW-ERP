const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabaseClient.rpc('get_columns_dummy_does_not_exist_but_let_s_see_error');
  // Alternatively, just do a select with limit 1
  const { data: d2, error: e2 } = await supabaseClient.from('lead_equipment_history').select('*').limit(1);
  console.log(d2, e2);
}
check();
