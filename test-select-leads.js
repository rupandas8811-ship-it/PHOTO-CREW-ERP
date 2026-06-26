import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, anonKey);

async function run() {
  const { data: authData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'sale@photocrew.com',
    password: 'sales@123'
  });

  if (loginErr) {
    console.error('Login failed:', loginErr.message);
    return;
  }
  
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  if (error) {
    console.error("SELECT failed:", error);
  } else {
    console.log("SELECT succeeded, got rows:", data.length);
  }
}

run();
