import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_policies', {});
  if (error) {
    console.error("RPC failed, trying raw query...", error.message);
    // Well, we can't do raw query from client without a specific RPC. 
    // Let's just try to update a lead and see the exact error.
  }
}
check();
