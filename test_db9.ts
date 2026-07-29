import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('operations').select('operation_id, order_id, event_status');
  console.log("Empty order_ids:", data?.filter(o => !o.order_id));
}
run();
