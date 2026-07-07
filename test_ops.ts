import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function runTest() {
  const clientService = createClient(url, serviceRoleKey);
  
  console.log('\n--- Testing Insert into operations using Service Role Client ---');
  const dummyOp = {
    operation_id: 'OP-TEST-' + Math.floor(1000 + Math.random() * 9000),
    order_id: 'ORD-1733',
    photographer_assigned: 'Unassigned',
    videographer_assigned: 'Unassigned',
    drone_operator_assigned: 'Unassigned',
    assistant_assigned: 'Unassigned',
    equipment_kit: '',
    reporting_time: '10:00:00',
    event_status: 'Scheduled',
    remarks: 'Test Service Role Insert',
    updated_by: 'Test Service System'
  };
  
  const { data: insData, error: insErr } = await clientService.from('operations').insert(dummyOp).select();
  if (insErr) {
    console.error('Service Role Insert Error:', insErr);
    console.error('Code:', insErr.code, 'Message:', insErr.message);
  } else {
    console.log('Service Role Insert Success!', insData);
    // clean up
    if (insData && insData.length > 0) {
      await clientService.from('operations').delete().eq('operation_id', insData[0].operation_id);
      console.log('Successfully cleaned up.');
    }
  }
}

runTest();
