const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: `
    SELECT pg_get_indexdef(indexrelid) AS index_def
    FROM pg_index
    WHERE indrelid = 'public.staff_assignments'::regclass;
  ` });
  console.log(data, error);
}

check();
