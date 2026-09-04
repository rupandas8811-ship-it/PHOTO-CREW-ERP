import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  const { data, error } = await supabase.rpc('exec_sql', { query: 'SELECT 1' }).catch(() => ({ data: null, error: null }));
  console.log("RPC exec_sql:", error ? error.message : data);
}

inspect();
