import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function inspect() {
  console.log('Querying users columns...');
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'users' });
  if (error) {
    // Let's use custom sql execution or read raw REST
    console.log('RPC get_table_columns failed, attempting direct query...');
    const { data: dbCols, error: colsErr } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    if (colsErr) {
      console.error('Error fetching users:', colsErr);
    } else {
      console.log('Sample user record keys:', Object.keys(dbCols?.[0] || {}));
    }
  } else {
    console.log('Columns from RPC:', data);
  }
}

inspect();
