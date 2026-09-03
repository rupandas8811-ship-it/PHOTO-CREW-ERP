const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('staff_assignments').insert([
    { assignment_id: 'TEST-102', order_id: 'OR050', staff_role: 'Candid', staff_id: 'S1', staff_name: 'Akash__SLOT__102', assignment_date: '2026-01-01' },
    { assignment_id: 'TEST-103', order_id: 'OR050', staff_role: 'Video', staff_id: 'S1', staff_name: 'Akash__SLOT__103', assignment_date: '2026-01-01' }
  ]);
  console.log("Insert slot suffix:", error);
}
check();
