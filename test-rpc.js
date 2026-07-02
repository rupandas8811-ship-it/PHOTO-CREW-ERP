const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, key);
supabase.rpc('exec_sql', { query: 'SELECT 1' }).then(console.log);
