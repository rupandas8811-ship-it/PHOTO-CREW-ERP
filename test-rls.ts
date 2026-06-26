import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient('http://localhost:3000/supabase', process.env.SUPABASE_ANON_KEY || 'dummy');
async function run() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  console.log('Error:', error);
}
run();
