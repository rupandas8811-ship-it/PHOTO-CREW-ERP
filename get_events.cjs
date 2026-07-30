const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: ld, error } = await supabaseClient.from('leads').select('events').limit(5);
  console.log("events:", ld ? ld.map(l => l.events).flat().filter(e => e) : error);
}
check();
