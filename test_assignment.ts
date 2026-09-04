import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function resetDb() {
  await supabase.from('staff_assignments').update({ equipment: [] }).eq('order_id', 'OR054');
  console.log('Reset equipment for OR054');
}
resetDb();
