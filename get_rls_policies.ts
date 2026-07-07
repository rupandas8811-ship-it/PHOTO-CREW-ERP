import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
  const { data, error } = await supabase.rpc('rls_auto_enable', { table_name: 'payments' });
  console.log('rls_auto_enable response:', { data, error });

  const { data: policies, error: polErr } = await supabase
    .from('pg_policies' as any)
    .select('*')
    .eq('tablename', 'payments');
  console.log('Policies query response:', { policies, polErr });
}

run();
