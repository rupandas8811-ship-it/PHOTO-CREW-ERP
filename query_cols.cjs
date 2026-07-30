const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: cols } = await supabaseClient.from('staff_assignments').select('*').limit(2);
  console.log("Cols via data:", cols ? Object.keys(cols[0] || {}) : 'none');
  console.log("First row:", cols[0]);
}
check();
