import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await db.from('payments').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  }
}
run();
