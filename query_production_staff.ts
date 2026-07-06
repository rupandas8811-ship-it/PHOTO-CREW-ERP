import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const testId = `STF-${Math.floor(1000 + Math.random() * 9000)}`;
  const payload = {
    staff_id: testId,
    name: 'Rahul Test',
    mobile: '9876543210',
    email: 'rahul@photocrew.com',
    role: 'Editor',
    department: 'Post-Production',
    status: 'Active',
    joining_date: new Date().toISOString().split('T')[0],
    "'production_role_speciality": 'VFX, Editing'
  };

  const { data, error } = await supabaseClient
    .from('production_staff')
    .insert(payload)
    .select();

  console.log('Insert response:', data, error);

  if (data && data.length > 0) {
    // Clean it up
    await supabaseClient.from('production_staff').delete().eq('staff_id', testId);
  }
}

run();
