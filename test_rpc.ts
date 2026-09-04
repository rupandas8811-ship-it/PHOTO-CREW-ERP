import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRpc() {
  const rpcs = ['exec_sql', 'run_sql', 'execute_sql', 'query', 'pgmeta'];
  for (const name of rpcs) {
    const res = await supabase.rpc(name, { query: 'SELECT 1' });
    console.log(name, res.error ? res.error.message : 'SUCCESS');
  }
}

testRpc();
