import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient('http://localhost:3000/supabase', process.env.SUPABASE_ANON_KEY || 'dummy');
async function run() {
  const cleanInput = 'owner@photocrew.com';
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`email.ilike.${cleanInput},username.ilike.${cleanInput}`);
  console.log('data:', data, 'error:', error);
}
run();
