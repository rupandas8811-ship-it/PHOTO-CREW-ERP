import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data: order } = await supabase.from('orders').select('lead_id, order_id').eq('order_id', 'OR054');
  console.log("Order:", order);
}
test();
