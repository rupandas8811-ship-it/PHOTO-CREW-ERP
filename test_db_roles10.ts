import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data: staff } = await supabase.from('staff').select('name, role, equipment').eq('name', 'APPU');
  console.log(staff);
}
test();
