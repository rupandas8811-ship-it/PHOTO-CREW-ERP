const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: cols, error } = await supabaseClient.from('raw_footage_links').select('*').limit(1);
  console.log("raw_footage_links:", error);
}
check();
