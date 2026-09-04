import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSpace() {
  const { data: ord } = await supabase.from('orders').select('order_id').limit(1);
  const orderId = ord?.[0]?.order_id;
  if (!orderId) { console.log('no order'); return; }

  const res1 = await supabase.from('staff_assignments').insert({ order_id: orderId, staff_role: 'ZZZZ', assignment_id: 'A1', staff_id: 'S1', staff_name: 'S' }).select();
  console.log("Insert 1:", res1.error?.message);

  const res2 = await supabase.from('staff_assignments').insert({ order_id: orderId, staff_role: 'ZZZZ', assignment_id: 'A2', staff_id: 'S1', staff_name: 'S' }).select();
  console.log("Insert 2 (duplicate):", res2.error?.message);

  const res3 = await supabase.from('staff_assignments').insert({ order_id: orderId, staff_role: 'ZZZZ ', assignment_id: 'A3', staff_id: 'S1', staff_name: 'S' }).select();
  console.log("Insert 3 (duplicate space):", res3.error?.message);

  const res4 = await supabase.from('staff_assignments').insert({ order_id: orderId, staff_role: 'ZZZZ', assignment_id: 'A4', staff_id: 'S2', staff_name: 'S' }).select();
  console.log("Insert 4 (diff staff, same role):", res4.error?.message);

  // cleanup
  await supabase.from('staff_assignments').delete().eq('order_id', orderId).like('staff_role', 'ZZZZ%');
}

testSpace();
