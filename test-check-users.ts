import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient('http://localhost:3000/supabase', process.env.SUPABASE_ANON_KEY || 'dummy');
async function run() {
  const { data } = await supabase.from('users').select('*');
  console.log(data);
}
run();