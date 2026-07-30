const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: sa } = await supabaseClient.from('staff_assignments').select('*').limit(1);
  console.log("staff_assignments:", sa ? Object.keys(sa[0] || {}) : 'error');
  const { data: rf } = await supabaseClient.from('raw_footage').select('*').limit(1);
  console.log("raw_footage:", rf ? Object.keys(rf[0] || {}) : 'error');
  const { data: leh } = await supabaseClient.from('lead_equipment_history').select('*').limit(1);
  console.log("lead_equipment_history:", leh ? Object.keys(leh[0] || {}) : 'error');
}
check();
