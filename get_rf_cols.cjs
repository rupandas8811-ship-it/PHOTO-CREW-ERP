const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: rf } = await supabaseClient.from('raw_footage').select('*').limit(5);
  console.log("raw_footage columns:", rf.length > 0 ? Object.keys(rf[0]) : 'no data');
  console.log("raw_footage data:", rf);
}
check();
