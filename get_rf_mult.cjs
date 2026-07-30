const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: rf } = await supabaseClient.from('raw_footage').select('order_id');
  const counts = {};
  rf.forEach(r => { counts[r.order_id] = (counts[r.order_id] || 0) + 1; });
  console.log("Counts:", counts);
}
check();
