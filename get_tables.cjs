const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: cols, error } = await supabaseClient.rpc('exec_sql', { sql: "SELECT table_name, column_name FROM information_schema.columns WHERE column_name ILIKE '%footage%';" });
  console.log("tables:", cols, error);
}
check();
