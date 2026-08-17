require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: prods } = await supabase.from('production').select('*').limit(1);
  if (!prods.length) return console.log('No productions');
  const prod = prods[0];
  console.log('Testing prod:', prod.production_id);
  
  const { data: staffList } = await supabase.from('production_staff').select('*').eq('role', 'Editor');
  if (!staffList.length) return console.log('No editor staff');
  const staff = staffList[0];
  console.log('Testing staff:', staff.staff_name);
  
  // Try to insert editor assignment manually like the UI does
  const newStaffAssignments = [{
    assignment_id: 'TEST-1234',
    order_id: prod.tracking_id || prod.production_id, // tracking_id is orderId
    staff_role: staff.role || 'Editor',
    staff_id: staff.staff_id,
    staff_name: staff.staff_name,
    assignment_date: new Date().toISOString().split('T')[0],
    assignment_status: 'Assigned',
    task_status: 'Pending',
    event_id: 'ev-test',
    event_name: 'Test Event',
    updated_by: 'Test System'
  }];
  
  const { data, error } = await supabase.from('staff_assignments').insert(newStaffAssignments).select();
  console.log('Result:', error || data);
}
run();
