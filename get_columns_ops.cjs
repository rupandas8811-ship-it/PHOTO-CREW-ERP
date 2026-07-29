const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabaseClient.from('operations').select('*').limit(1);
  console.log("operations:", data ? Object.keys(data[0] || {}) : [], error);
}
check();
