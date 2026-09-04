import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data: order } = await supabase.from('orders').select('lead_id, order_id').eq('order_id', 'OR054');
  if (order && order.length > 0) {
    const { data: leads } = await supabase.from('leads').select('lead_id, events').eq('lead_id', order[0].lead_id);
    if (leads && leads.length > 0) {
      console.log('Lead Events:', JSON.stringify(leads[0].events, null, 2));
    } else {
      console.log('No leads found for lead_id:', order[0].lead_id);
    }
  }
}
test();
