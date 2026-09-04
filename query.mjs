import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf-8')
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split('='))
);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('v_task_assignment_details').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
