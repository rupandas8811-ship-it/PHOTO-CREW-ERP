const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: cols, error } = await supabaseClient.rpc('exec_sql', { sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name ILIKE '%event%';" });
  console.log("leads event cols:", cols, error);
}
check();
