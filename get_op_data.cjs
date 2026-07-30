const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: op } = await supabaseClient.from('operations').select('*').limit(2);
  console.log("op:", op);
}
check();
