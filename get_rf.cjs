const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: rf } = await supabaseClient.from('raw_footage').select('*').eq('order_id', 'OR106');
  console.log("raw_footage for OR106:", rf);
}
check();
