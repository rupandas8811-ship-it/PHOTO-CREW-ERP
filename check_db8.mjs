import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_check_constraints');
  if (error) {
     const { data: d2 } = await supabase.from('information_schema.check_constraints').select('*').limit(10);
     console.log("Check constraints:", d2);
  } else {
     console.log(data);
  }
}
check();
