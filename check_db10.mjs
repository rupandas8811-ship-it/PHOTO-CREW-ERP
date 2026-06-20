import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: dbOrders } = await supabase.from('orders').select('*').limit(1);
  const orderId = dbOrders[0].order_id;
  
  const updatePayload = { current_stage: 'Operations Assigned' }; 
  const { data, error } = await supabase.from('orders').update(updatePayload).eq('order_id', orderId).select();
  console.log("Error Operations Assigned:", error?.message);

  const updatePayload2 = { current_stage: 'Event Scheduled' }; 
  const { error: error2 } = await supabase.from('orders').update(updatePayload2).eq('order_id', orderId).select();
  console.log("Error Event Scheduled:", error2?.message);
}
check();
