import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('leads').select('lead_id, status, current_status, created_date').order('created_date', { ascending: false }).limit(5);
  console.log(data, error);
}
run();
