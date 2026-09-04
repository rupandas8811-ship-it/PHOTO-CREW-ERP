import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data: assignments } = await supabase.from('staff_assignments').select('*').eq('order_id', 'OR054');
  assignments.forEach(sa => {
    let eqList = [];
    const rawEq = sa.equipment || sa.assigned_equipment;
    if (Array.isArray(rawEq)) {
       rawEq.forEach(item => {
         if (typeof item === 'string' && item.trim()) eqList.push(item.trim());
       });
    }
    console.log(sa.staff_name, sa.staff_role, eqList);
  });
}
test();
