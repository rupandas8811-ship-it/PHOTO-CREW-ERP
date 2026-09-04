import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data: order } = await supabase.from('orders').select('lead_id, order_id').eq('order_id', 'OR054');
  console.log('Order:', order);
  if (order && order.length > 0) {
    const { data: leads } = await supabase.from('leads').select('lead_id, events, deliverables, raw_footage_details, team_requirements').eq('lead_id', order[0].lead_id);
    console.log('Lead:', JSON.stringify(leads, null, 2));
  }
}
test();
