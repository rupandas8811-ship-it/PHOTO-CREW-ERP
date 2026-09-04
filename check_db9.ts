import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function checkDb() {
  const { data: staffData } = await supabase.from('staff_assignments').select('*').limit(1);
  console.log('staff_assignments schema:', Object.keys(staffData?.[0] || {}));
  
  const { data: eqData } = await supabase.from('equipment_assignments').select('*').limit(1);
  console.log('equipment_assignments schema:', Object.keys(eqData?.[0] || {}));
  
  const { data: operationsData } = await supabase.from('operations').select('*').limit(1);
  console.log('operations schema:', Object.keys(operationsData?.[0] || {}));
}
checkDb();
