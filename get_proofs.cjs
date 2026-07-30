const { createClient } = require('@supabase/supabase-js');
const supabaseClient = createClient('https://aqifyxsimhqayfjwzzwj.supabase.co', 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB');
async function check() {
  const { data: leh } = await supabaseClient.from('lead_equipment_history').select('*');
  const types = new Set(leh?.map(l => l.proof_type));
  const remarks = leh?.map(l => l.remarks).filter(r => r && r.toLowerCase().includes('footage'));
  console.log("types:", Array.from(types));
  console.log("footage in remarks:", remarks);
}
check();
