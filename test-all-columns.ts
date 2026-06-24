import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, anonKey);

async function checkCols(table: string) {
  const { data } = await supabase.from(table).select('*').limit(1);
  if (data) {
    if (data.length > 0) {
      console.log(`Columns for ${table}:`, Object.keys(data[0]));
    } else {
      console.log(`No data in ${table}`);
    }
  } else {
    console.log(`Table ${table} error`);
  }
}

async function run() {
  await checkCols('users');
  await checkCols('leads');
  await checkCols('orders');
  await checkCols('production');
  await checkCols('operations');
  await checkCols('staff_assignments');
  await checkCols('editor_assignments');
}
run();
