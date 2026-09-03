require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { error: error2 } = await supabase.from('staff_assignments').insert([
    { assignment_id: 'SIM-1', order_id: 'OR050', staff_role: 'Candid', staff_id: 'S1', staff_name: 'Staff A', assignment_date: '2026-01-01' },
    { assignment_id: 'SIM-2', order_id: 'OR050', staff_role: 'Candid', staff_id: 'S2', staff_name: 'Staff B', assignment_date: '2026-01-01' }
  ]);
  console.log("Error Simulate:", error2);
  
  await supabase.from('staff_assignments').delete().in('assignment_id', ['SIM-1', 'SIM-2']);
}
run();
