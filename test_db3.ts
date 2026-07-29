import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .rpc('execute_sql', { sql_query: "SELECT trigger_name, event_manipulation, event_object_table, action_statement FROM information_schema.triggers WHERE event_object_table = 'leads';" });
  console.log(data, error);
}
run();
