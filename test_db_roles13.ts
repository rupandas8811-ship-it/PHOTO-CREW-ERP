import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const { data, error } = await supabase.from('staff_assignments').select('event_start_photo, event_end_photo, equipment_received_photo, equipment_handover_photo').limit(1);
  console.log(data, error);
}
test();
