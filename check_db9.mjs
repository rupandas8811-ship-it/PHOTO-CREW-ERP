import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('orders').select('current_stage');
  const distinct = [...new Set(data.map(r => r.current_stage))];
  console.log("Existing distinct current_stage values:", distinct);
}
check();
