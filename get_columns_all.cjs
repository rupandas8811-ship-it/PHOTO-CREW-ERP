const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabaseClient.from('lead_equipment_history').select('*').limit(1);
  console.log("lead_equipment_history:", data ? Object.keys(data[0] || {}) : [], error);
  
  const { data: d2, error: e2 } = await supabaseClient.from('staff_assignments').select('*').limit(1);
  console.log("staff_assignments:", d2 ? Object.keys(d2[0] || {}) : [], e2);
}
check();
