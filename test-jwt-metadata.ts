import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

async function run() {
  const supabase = createClient(url, anonKey);
  console.log('Logging in as sale@photocrew.com...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'sale@photocrew.com',
    password: 'sales@123',
  });

  if (authErr) {
    console.error('Login failed:', authErr);
    return;
  }
  console.log('Logged in successfully!');

  // Let's call an RPC that returns auth.jwt() as JSONB
  // Wait, let's create a temporary RPC via SQL, but wait, we can't do raw SQL via client-side easily.
  // Wait, is there any RPC we can use? Let's check what rpcs are available.
  // Let's write a sql to create a function to return auth.jwt() and call it!
}

run();
