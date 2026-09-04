import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function checkDb() {
  const { data } = await supabase.from('leads').select('sales_staff_mobile').limit(5);
  console.log(data);
}
checkDb();
