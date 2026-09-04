import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  const { data: rows, error } = await supabase.from('leads').select('*').limit(1);
  console.log("leads row values:", rows?.[0] ? rows[0].lead_id : null);
}

inspect();
