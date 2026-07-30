const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: le } = await supabaseClient.from('lead_events').select('*').limit(2);
  console.log("lead_events columns:", le.length > 0 ? Object.keys(le[0]) : 'no data');
  console.log("lead_events data:", le);
}
check();
