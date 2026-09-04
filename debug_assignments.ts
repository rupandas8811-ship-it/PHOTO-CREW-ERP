import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data: assignments } = await supabase.from('staff_assignments').select('*').eq('order_id', 'OR054');
  console.log(JSON.stringify(assignments.map(a => ({ name: a.staff_name, eq: a.equipment })), null, 2));
}
test();
