import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient('http://localhost:3000/supabase', process.env.SUPABASE_ANON_KEY || 'dummy');

async function run() {
  const { data, error, count } = await supabase.from('leads').select('count', { count: 'exact', head: true });
  console.log('Result:', data, 'Error:', error, 'Count:', count);
}
run();