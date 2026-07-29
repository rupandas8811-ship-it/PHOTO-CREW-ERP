import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('operations').select('*');
  console.log("Max operation ID:", Math.max(...data.map(o => parseInt((o.order_id || '').replace(/\D/g, '') || '0'))));
}
run();
