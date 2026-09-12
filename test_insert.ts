import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: d1, error: e1 } = await supabase.from('staff_assignments').insert({
    assignment_id: 'TEST-1',
    order_id: 'ORD-TEST',
    staff_id: 'STF-TEST',
    staff_role: 'Photographer\uFEFF',
    event_id: 'EV-1'
  });
  console.log("Insert 1:", e1);

  const { data: d2, error: e2 } = await supabase.from('staff_assignments').insert({
    assignment_id: 'TEST-2',
    order_id: 'ORD-TEST',
    staff_id: 'STF-TEST',
    staff_role: 'Photographer\uFEFF\uFEFF\uFEFF\uFEFF\uFEFF\uFEFF',
    event_id: 'EV-2'
  });
  console.log("Insert 2:", e2);
  
  await supabase.from('staff_assignments').delete().eq('order_id', 'ORD-TEST');
}
test();
