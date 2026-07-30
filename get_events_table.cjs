const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: evts } = await supabaseClient.from('events').select('*').limit(5);
  console.log("events table:", evts ? Object.keys(evts[0] || {}) : 'error');
  if (evts && evts.length > 0) console.log(evts[0]);
}
check();
