import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data: order } = await supabase.from('orders').select('lead_id, order_id').eq('order_id', 'OR054');
  const { data: leads } = await supabase.from('leads').select('events').eq('lead_id', order[0].lead_id);
  const ev1 = leads[0].events.find(e => e.id === '953c68ab-61b8-41b1-be80-bdd5c3466d19');
  console.log(ev1.assigned_staff_names);
  console.log(ev1.assigned_staff_mobiles);
}
test();
