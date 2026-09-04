import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function resetDb() {
  await supabase.from('operations').update({ equipment_kit: null }).eq('order_id', 'OR054');
  
  // Clean assigned_staff_mobiles from leads
  const { data: leads } = await supabase.from('leads').select('lead_id, events').eq('lead_id', 'LD054');
  if (leads && leads.length > 0) {
     const events = leads[0].events;
     if (Array.isArray(events)) {
       events.forEach(e => {
         if (e.assigned_staff_mobiles && e.assigned_staff_mobiles.includes('|| EQUIPMENT')) {
           e.assigned_staff_mobiles = e.assigned_staff_mobiles.split('||')[0].trim();
         }
       });
       await supabase.from('leads').update({ events }).eq('lead_id', 'LD054');
     }
  }
  
  console.log('Reset leads and operations for OR054');
}
resetDb();
