import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_statement: "SELECT conname FROM pg_constraint WHERE conrelid = 'staff_assignments'::regclass" });
  console.log("Constraints:", data, error);
}
test();
