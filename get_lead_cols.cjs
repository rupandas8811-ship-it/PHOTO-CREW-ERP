const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: leads } = await supabaseClient.from('leads').select('*').limit(1);
  console.log("leads columns:", leads ? Object.keys(leads[0] || {}) : 'error');
}
check();
