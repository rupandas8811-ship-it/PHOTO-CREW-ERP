import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: assignments, error } = await supabase.from('staff_assignments').select('assignment_id, order_id, staff_id, staff_role, event_id, staff_name').limit(10);
  console.log("Assignments:", assignments);
}
test();
