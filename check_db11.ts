import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function checkDb() {
  const { data: staffData } = await supabase.from('staff_assignments').select('assignment_id, event_id, equipment, staff_role').eq('order_id', 'OR054');
  console.log('staff_assignments OR054:', JSON.stringify(staffData, null, 2));
}
checkDb();
