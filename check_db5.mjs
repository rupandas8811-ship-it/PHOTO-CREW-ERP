import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: dbOrders } = await supabase.from('orders').select('*').limit(1);
  const orderId = dbOrders[0].order_id;
  
  const updatePayload = { current_stage: 'Staff Assigned' }; 
  const { data, error: updateErr } = await supabase.from('orders').update(updatePayload).eq('order_id', orderId).select();
  console.log("Update Error Orders Current Stage:", updateErr?.message);
}
check();
