require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { error: error2 } = await supabase.from('staff_assignments').insert([
    { assignment_id: 'TEST-10', order_id: 'OR050', staff_role: 'Candid', staff_id: 'S1', staff_name: 'Akash__SLOT__10', assignment_date: '2026-01-01' },
    { assignment_id: 'TEST-11', order_id: 'OR050', staff_role: 'Video', staff_id: 'S1', staff_name: 'Akash__SLOT__11', assignment_date: '2026-01-01' }
  ]);
  console.log("Error SUFFIX:", error2);
  
  await supabase.from('staff_assignments').delete().in('assignment_id', ['TEST-10', 'TEST-11']);
}
run();
